import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ReminderModal } from './ReminderModal'
import type { Reminder } from '@/types/habits'

const editingReminder: Reminder = {
  id: 'reminder-1',
  name: 'Multivitamin',
  description: 'Sample reminder',
  icon: 'pill',
  category: 'supplements',
  frequency: { type: 'daily' },
  target: 1,
  reminderEnabled: true,
  reminderTime: '08:00',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('ReminderModal', () => {
  it('starts blank when adding a new reminder', () => {
    render(<ReminderModal isOpen onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('pre-fills fields when editing', () => {
    render(<ReminderModal isOpen onClose={() => {}} onSave={() => {}} editingReminder={editingReminder} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Multivitamin')
    expect(screen.getByLabelText('Reminder time')).toHaveValue('08:00')
  })

  it('disables save until a title is entered', async () => {
    const user = userEvent.setup()
    render(<ReminderModal isOpen onClose={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('button', { name: 'Add Reminder' })).toBeDisabled()
    await user.type(screen.getByLabelText('Title'), 'Prepare gym bag')
    expect(screen.getByRole('button', { name: 'Add Reminder' })).toBeEnabled()
  })

  it('saves a custom reminder with the given frequency and time', async () => {
    const user = userEvent.setup()
    const handleSave = vi.fn()
    render(<ReminderModal isOpen onClose={() => {}} onSave={handleSave} defaultCategory="custom" />)

    await user.type(screen.getByLabelText('Title'), 'Prepare gym bag')
    await user.click(screen.getByRole('button', { name: 'Add Reminder' }))

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Prepare gym bag', category: 'custom', reminderEnabled: true }),
    )
  })

  it('can deactivate a reminder via the Active toggle', async () => {
    const user = userEvent.setup()
    const handleSave = vi.fn()
    render(<ReminderModal isOpen onClose={() => {}} onSave={handleSave} editingReminder={editingReminder} />)

    await user.click(screen.getByRole('switch', { name: 'Active' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({ active: false }))
  })

  it('resets to blank the next time it is reopened for a new reminder', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [isOpen, setIsOpen] = useState(true)
      return (
        <>
          <button onClick={() => setIsOpen(true)}>reopen</button>
          <ReminderModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={() => {}} />
        </>
      )
    }

    render(<Harness />)
    await user.type(screen.getByLabelText('Title'), 'Temporary')
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByText('reopen'))

    expect(screen.getByLabelText('Title')).toHaveValue('')
  })
})
