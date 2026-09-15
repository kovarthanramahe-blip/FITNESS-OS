import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WeightEntryModal } from './WeightEntryModal'
import type { WeightLog } from '@/types/progress'

const editingLog: WeightLog = { id: 'log-1', date: '2024-06-01', weightKg: 72.4, note: 'Morning' }

describe('WeightEntryModal', () => {
  it('starts blank when adding a new entry', () => {
    render(<WeightEntryModal isOpen onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(null)
  })

  it('pre-fills fields when editing an existing entry', () => {
    render(<WeightEntryModal isOpen onClose={() => {}} onSave={() => {}} editingLog={editingLog} />)
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(72.4)
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Morning')
  })

  it('disables save until a valid weight is entered', async () => {
    const user = userEvent.setup()
    render(<WeightEntryModal isOpen onClose={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('button', { name: 'Add Entry' })).toBeDisabled()
    await user.type(screen.getByLabelText('Weight (kg)'), '70')
    expect(screen.getByRole('button', { name: 'Add Entry' })).toBeEnabled()
  })

  it('resets to blank the next time it is reopened for a new entry, discarding unsaved input', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [isOpen, setIsOpen] = useState(true)
      return (
        <>
          <button onClick={() => setIsOpen(true)}>reopen</button>
          <WeightEntryModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={() => {}} />
        </>
      )
    }

    render(<Harness />)
    await user.type(screen.getByLabelText('Weight (kg)'), '99')
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(99)

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByText('reopen'))

    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(null)
  })

  it('calls onSave with the entered values and closes', async () => {
    const user = userEvent.setup()
    const handleSave = vi.fn()
    const handleClose = vi.fn()
    render(<WeightEntryModal isOpen onClose={handleClose} onSave={handleSave} />)

    await user.type(screen.getByLabelText('Weight (kg)'), '70.5')
    await user.click(screen.getByRole('button', { name: 'Add Entry' }))

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 70.5 }))
    expect(handleClose).toHaveBeenCalledOnce()
  })
})
