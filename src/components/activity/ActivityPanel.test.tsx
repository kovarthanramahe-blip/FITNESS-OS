import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActivityPanel } from './ActivityPanel'
import { resetActivityStoreForTests } from '@/lib/activityStore'
import { resetProgressStoreForTests } from '@/lib/progressStore'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'

const TODAY = getTodayDateString()
const YESTERDAY = addDaysToDateString(TODAY, -1)

// A signed-in, un-seeded slate — the default (unauthenticated) store
// carries demo activity entries/steps for recent relative dates, which
// would otherwise interfere with these exact-value assertions.
beforeEach(() => {
  setCurrentUserId('user-activity-panel-test')
  resetActivityStoreForTests()
  resetProgressStoreForTests()
})

afterEach(() => {
  resetStorageScopeForTests()
  resetActivityStoreForTests()
})

describe('ActivityPanel — logging an activity', () => {
  it('adds a manually logged activity and reflects it in today\'s summary and history', async () => {
    const user = userEvent.setup()
    render(<ActivityPanel />)

    await user.click(screen.getByRole('button', { name: 'Add Activity' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Activity'), 'running')
    await user.selectOptions(within(dialog).getByLabelText('Intensity'), 'running-moderate')
    const durationInput = within(dialog).getByLabelText('Duration (minutes)')
    await user.clear(durationInput)
    await user.type(durationInput, '30')
    await user.click(within(dialog).getByRole('button', { name: 'Add Activity' }))

    const historyList = screen.getByRole('list')
    expect(within(historyList).getByText('Running')).toBeInTheDocument()
    // 8.5 MET × 70 kg (fallback, no weight on file) × 3.5 / 200 × 30 min = 312 kcal
    expect(within(historyList).getByText(/312 kcal/)).toBeInTheDocument()
    expect(screen.getByText('Active Minutes').closest('div')?.parentElement).toHaveTextContent('30')
  })

  it('deletes a logged activity from history', async () => {
    const user = userEvent.setup()
    render(<ActivityPanel />)

    await user.click(screen.getByRole('button', { name: 'Add Activity' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add Activity' }))
    const historyList = screen.getByRole('list')
    expect(within(historyList).getByText('Walking')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Delete Walking/ }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('No activities logged yet — add one to get started.')).toBeInTheDocument()
  })
})

describe('ActivityPanel — steps respect the selected date, never cross-contaminating', () => {
  it('logs steps for the selected date without affecting another date', async () => {
    const user = userEvent.setup()
    render(<ActivityPanel />)

    const stepsField = screen.getByLabelText('Log steps for this date')
    await user.type(stepsField, '8500')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getAllByText('8,500').length).toBeGreaterThan(0) // Steps stat + Today block both show it

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    // Yesterday has no steps logged — the field placeholder reflects 0, not today's value.
    expect(screen.getByLabelText('Log steps for this date')).toHaveAttribute('placeholder', '0')
  })
})

describe('ActivityPanel — date navigation', () => {
  it('starts on today and supports navigating to the previous day', async () => {
    const user = userEvent.setup()
    render(<ActivityPanel />)

    expect(screen.getByLabelText('Activity date')).toHaveValue(TODAY)
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(screen.getByLabelText('Activity date')).toHaveValue(YESTERDAY)
  })
})
