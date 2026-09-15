import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { HabitsCard } from './HabitsCard'
import { resetHabitStoreForTests, useHabitStore } from '@/lib/habitStore'
import type { Habit } from '@/types/habits'

const habits: Habit[] = [
  {
    id: 'workout',
    name: 'Complete workout',
    icon: 'dumbbell',
    category: 'fitness',
    frequency: { type: 'daily' },
    target: 1,
    reminderEnabled: false,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'water-habit',
    name: 'Drink water',
    icon: 'droplets',
    category: 'hydration',
    frequency: { type: 'daily' },
    target: 1,
    reminderEnabled: false,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

function Harness() {
  const { entries } = useHabitStore()
  return <HabitsCard habits={habits} entries={entries} />
}

function renderHabitsCard() {
  return render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  resetHabitStoreForTests()
})

describe('HabitsCard', () => {
  it('renders each habit with its completion state', () => {
    renderHabitsCard()

    expect(screen.getByText('0 of 2 done today')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Mark Complete workout as done' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox', { name: 'Mark Drink water as done' })).toHaveAttribute('aria-checked', 'false')
  })

  it('completes a habit via the shared habitStore when clicked', async () => {
    const user = userEvent.setup()
    renderHabitsCard()

    await user.click(screen.getByRole('checkbox', { name: 'Mark Complete workout as done' }))

    expect(screen.getByRole('checkbox', { name: 'Mark Complete workout as not done' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('1 of 2 done today')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is scheduled today', () => {
    render(
      <MemoryRouter>
        <HabitsCard habits={[{ ...habits[0]!, frequency: { type: 'weekdays', days: [] } }]} entries={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('No habits scheduled today')).toBeInTheDocument()
  })
})
