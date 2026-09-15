import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HabitCard } from './HabitCard'
import type { Habit, HabitEntry } from '@/types/habits'
import { getTodayDateString } from '@/utils/dateRange'

const habit: Habit = {
  id: 'habit-1',
  name: 'Stretch',
  description: 'A short mobility session.',
  icon: 'sparkles',
  category: 'wellness',
  frequency: { type: 'daily' },
  target: 1,
  unit: 'session',
  reminderEnabled: true,
  reminderTime: '19:00',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

function noop() {
  // intentionally empty
}

describe('HabitCard', () => {
  it('renders name, description, target, and reminder time', () => {
    render(
      <HabitCard habit={habit} entries={[]} onComplete={noop} onUncomplete={noop} onEdit={noop} onToggleActive={noop} onDelete={noop} />,
    )
    expect(screen.getByText('Stretch')).toBeInTheDocument()
    expect(screen.getByText('A short mobility session.')).toBeInTheDocument()
    expect(screen.getByText('Target: 1 session')).toBeInTheDocument()
    expect(screen.getByText('Reminder 19:00')).toBeInTheDocument()
  })

  it('calls onComplete when the pending checkbox is clicked', async () => {
    const user = userEvent.setup()
    const handleComplete = vi.fn()
    render(
      <HabitCard
        habit={habit}
        entries={[]}
        onComplete={handleComplete}
        onUncomplete={noop}
        onEdit={noop}
        onToggleActive={noop}
        onDelete={noop}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Mark Stretch as done today' }))
    expect(handleComplete).toHaveBeenCalledWith(habit)
  })

  it('calls onUncomplete when an already-completed habit is clicked', async () => {
    const user = userEvent.setup()
    const handleUncomplete = vi.fn()
    const entries: HabitEntry[] = [{ id: 'e1', habitId: habit.id, date: getTodayDateString(), completedAt: new Date().toISOString() }]
    render(
      <HabitCard
        habit={habit}
        entries={entries}
        onComplete={noop}
        onUncomplete={handleUncomplete}
        onEdit={noop}
        onToggleActive={noop}
        onDelete={noop}
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Mark Stretch as not done today' })
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    await user.click(checkbox)
    expect(handleUncomplete).toHaveBeenCalledWith(habit)
  })

  it('disables the completion control for an unscheduled day', () => {
    const unscheduled: Habit = { ...habit, frequency: { type: 'weekdays', days: [] } }
    render(
      <HabitCard habit={unscheduled} entries={[]} onComplete={noop} onUncomplete={noop} onEdit={noop} onToggleActive={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('checkbox', { name: 'Stretch is not scheduled today' })).toBeDisabled()
  })

  it('calls onEdit, onToggleActive, and onDelete from their respective buttons', async () => {
    const user = userEvent.setup()
    const handleEdit = vi.fn()
    const handleToggle = vi.fn()
    const handleDelete = vi.fn()
    render(
      <HabitCard
        habit={habit}
        entries={[]}
        onComplete={noop}
        onUncomplete={noop}
        onEdit={handleEdit}
        onToggleActive={handleToggle}
        onDelete={handleDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Stretch' }))
    await user.click(screen.getByRole('button', { name: 'Deactivate Stretch' }))
    await user.click(screen.getByRole('button', { name: 'Delete Stretch' }))

    expect(handleEdit).toHaveBeenCalledWith(habit)
    expect(handleToggle).toHaveBeenCalledWith(habit)
    expect(handleDelete).toHaveBeenCalledWith(habit)
  })
})
