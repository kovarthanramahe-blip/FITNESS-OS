import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { WaterCard } from './WaterCard'
import { getHabitState, resetHabitStoreForTests, useHabitStore } from '@/lib/habitStore'
import type { WaterGoal } from '@/types/habits'
import { getDailyWaterMl, mlToLiters } from '@/utils/habits'
import { getTodayDateString } from '@/utils/dateRange'

const goal: WaterGoal = { goalMl: 3000, preferredUnit: 'l' }

function Harness() {
  const { waterLogs } = useHabitStore()
  return <WaterCard logs={waterLogs} goal={goal} />
}

beforeEach(() => {
  resetHabitStoreForTests()
})

describe('WaterCard', () => {
  it('renders the current and target amounts', () => {
    render(<WaterCard logs={[]} goal={goal} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('L / 3L')).toBeInTheDocument()
  })

  it('reflects logs already recorded for today', () => {
    render(
      <WaterCard
        logs={[{ id: 'w1', date: new Date().toISOString().slice(0, 10), amountMl: 2100, createdAt: new Date().toISOString() }]}
        goal={goal}
      />,
    )
    expect(screen.getByText('2.1')).toBeInTheDocument()
  })

  it('updates the displayed amount when +250 ml is tapped, via the shared habitStore', async () => {
    const user = userEvent.setup()
    const before = getDailyWaterMl(getHabitState().waterLogs, getTodayDateString())
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add 250 milliliters of water' }))

    expect(await screen.findByText(String(mlToLiters(before + 250)))).toBeInTheDocument()
  })

  it('accumulates multiple quick-add taps', async () => {
    const user = userEvent.setup()
    const before = getDailyWaterMl(getHabitState().waterLogs, getTodayDateString())
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add 500 milliliters of water' }))
    await user.click(screen.getByRole('button', { name: 'Add 250 milliliters of water' }))

    expect(await screen.findByText(String(mlToLiters(before + 750)))).toBeInTheDocument()
  })
})
