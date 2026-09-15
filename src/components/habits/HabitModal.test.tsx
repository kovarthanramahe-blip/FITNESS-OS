import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HabitModal } from './HabitModal'
import type { Habit } from '@/types/habits'

const editingHabit: Habit = {
  id: 'habit-1',
  name: 'Stretch',
  description: 'Mobility work',
  icon: 'sparkles',
  category: 'wellness',
  frequency: { type: 'weekdays', days: [1, 3, 5] },
  target: 1,
  unit: 'session',
  reminderEnabled: true,
  reminderTime: '19:00',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('HabitModal', () => {
  it('starts blank when adding a new habit', () => {
    render(<HabitModal isOpen onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('pre-fills fields when editing, including weekday selection', () => {
    render(<HabitModal isOpen onClose={() => {}} onSave={() => {}} editingHabit={editingHabit} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Stretch')
    expect(screen.getByRole('button', { name: 'Mon' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tue' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables save until a name is entered', async () => {
    const user = userEvent.setup()
    render(<HabitModal isOpen onClose={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('button', { name: 'Add Habit' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name'), 'Read')
    expect(screen.getByRole('button', { name: 'Add Habit' })).toBeEnabled()
  })

  it('requires at least one selected weekday for a weekday schedule', async () => {
    const user = userEvent.setup()
    render(<HabitModal isOpen onClose={() => {}} onSave={() => {}} editingHabit={editingHabit} />)

    // Deselect all three pre-selected weekdays.
    await user.click(screen.getByRole('button', { name: 'Mon' }))
    await user.click(screen.getByRole('button', { name: 'Wed' }))
    await user.click(screen.getByRole('button', { name: 'Fri' }))

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })

  it('saves with a weekly schedule shape', async () => {
    const user = userEvent.setup()
    const handleSave = vi.fn()
    render(<HabitModal isOpen onClose={() => {}} onSave={handleSave} />)

    await user.type(screen.getByLabelText('Name'), 'Gym session')
    await user.selectOptions(screen.getByLabelText('Frequency'), 'weekly')
    await user.clear(screen.getByLabelText('Times per week'))
    await user.type(screen.getByLabelText('Times per week'), '4')
    await user.click(screen.getByRole('button', { name: 'Add Habit' }))

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Gym session', frequency: { type: 'weekly', timesPerWeek: 4 } }),
    )
  })

  it('resets to blank the next time it is reopened for a new habit', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [isOpen, setIsOpen] = useState(true)
      return (
        <>
          <button onClick={() => setIsOpen(true)}>reopen</button>
          <HabitModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={() => {}} />
        </>
      )
    }

    render(<Harness />)
    await user.type(screen.getByLabelText('Name'), 'Temporary')
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByText('reopen'))

    expect(screen.getByLabelText('Name')).toHaveValue('')
  })
})
