import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
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
