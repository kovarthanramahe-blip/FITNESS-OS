import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addWeightLog, deleteWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import { addDaysToDateString, getTodayDateString, parseDateOnly } from '@/utils/dateRange'
import { TodaysWeightCard } from './TodaysWeightCard'

beforeEach(() => {
  resetProgressStoreForTests()
})

describe('TodaysWeightCard', () => {
  it('displays the latest weight from progressStore', () => {
    render(<TodaysWeightCard />)
    const latest = [...getProgressState().weightLogs].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!
    expect(screen.getByText(`${latest.weightKg.toFixed(1)} kg`)).toBeInTheDocument()
  })

  it('shows the change from the previous entry', () => {
    render(<TodaysWeightCard />)
    expect(screen.getByText(/from previous entry/)).toBeInTheDocument()
  })

  it('shows a "no weight logged yet" state when there are no entries', () => {
    for (const log of getProgressState().weightLogs) deleteWeightLog(log.id)

    render(<TodaysWeightCard />)

    expect(screen.getByText('No weight logged yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Log Today's Weight" })).toBeInTheDocument()
  })

  it('opens the existing WeightEntryModal (not a second form) when "Log Weight" is clicked', async () => {
    const user = userEvent.setup()
    render(<TodaysWeightCard />)

    await user.click(screen.getByRole('button', { name: /Log Weight/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Weight Entry' })).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
  })

  it('reflects a newly logged weight from progressStore after saving', async () => {
    const user = userEvent.setup()
    render(<TodaysWeightCard />)

    await user.click(screen.getByRole('button', { name: /Log Weight/ }))
    await user.type(screen.getByLabelText('Weight (kg)'), '199.9')
    await user.click(screen.getByRole('button', { name: 'Add Entry' }))

    expect(getProgressState().weightLogs.some((log) => log.weightKg === 199.9)).toBe(true)
    expect(await screen.findByText('199.9 kg')).toBeInTheDocument()
  })
})

/**
 * Regression coverage for the label/date-truthfulness fix: the card used to
 * always say "Today's Weight" even when the latest log was several days
 * old (getCurrentWeightLog returns the most recent entry, not necessarily
 * today's). A signed-in, un-seeded slate is used here — the default
 * (unauthenticated) store carries demo weight logs for recent relative
 * dates, which would make "is this log actually from today" ambiguous.
 */
describe('TodaysWeightCard — label and date truthfulness', () => {
  const TODAY = getTodayDateString()
  const THREE_DAYS_AGO = addDaysToDateString(TODAY, -3)

  beforeEach(() => {
    setCurrentUserId('user-weight-date-regression')
    resetProgressStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('labels it "Today\'s Weight" with no date shown when the latest log is from today', () => {
    addWeightLog({ date: TODAY, weightKg: 82 })
    render(<TodaysWeightCard />)

    expect(screen.getByText("Today's Weight")).toBeInTheDocument()
    expect(screen.queryByText('Latest Weight')).not.toBeInTheDocument()
    expect(screen.getByText('82.0 kg')).toBeInTheDocument()
  })

  it('labels it "Latest Weight" and shows the actual date when the latest log is older than today', () => {
    addWeightLog({ date: THREE_DAYS_AGO, weightKg: 83.4 })
    render(<TodaysWeightCard />)

    expect(screen.getByText('Latest Weight')).toBeInTheDocument()
    expect(screen.queryByText("Today's Weight")).not.toBeInTheDocument()
    expect(screen.getByText('83.4 kg')).toBeInTheDocument()

    const expectedDate = parseDateOnly(THREE_DAYS_AGO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    expect(screen.getByText(new RegExp(expectedDate))).toBeInTheDocument()
  })

  it('still labels it "Today\'s Weight" with no entries yet (no misleading "Latest Weight" with nothing to show)', () => {
    render(<TodaysWeightCard />)

    expect(screen.getByText("Today's Weight")).toBeInTheDocument()
    expect(screen.getByText('No weight logged yet')).toBeInTheDocument()
  })
})
