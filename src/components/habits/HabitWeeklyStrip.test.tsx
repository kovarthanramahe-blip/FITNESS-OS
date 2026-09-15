import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HabitWeeklyStrip } from './HabitWeeklyStrip'
import type { Habit } from '@/types/habits'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Stretch',
    icon: 'sparkles',
    category: 'wellness',
    frequency: { type: 'daily' },
    target: 1,
    reminderEnabled: false,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('HabitWeeklyStrip', () => {
  it('renders all 7 days', () => {
    render(<HabitWeeklyStrip habit={makeHabit()} entries={[]} />)
    expect(screen.getAllByText(/^[MTWFS]$/)).toHaveLength(7)
  })

  it('marks unscheduled days distinctly for a weekday-only habit', () => {
    const habit = makeHabit({ frequency: { type: 'weekdays', days: [1, 3, 5] } })
    render(<HabitWeeklyStrip habit={habit} entries={[]} />)

    const unscheduled = screen.getAllByLabelText(/not scheduled/)
    const scheduled = screen.getAllByLabelText(/scheduled, not yet completed/)
    expect(unscheduled).toHaveLength(4)
    expect(scheduled).toHaveLength(3)
  })

  it('shows an inactive habit as inactive rather than pending or unscheduled', () => {
    render(<HabitWeeklyStrip habit={makeHabit({ active: false })} entries={[]} />)
    expect(screen.getAllByLabelText(/habit inactive/)).toHaveLength(7)
  })
})
