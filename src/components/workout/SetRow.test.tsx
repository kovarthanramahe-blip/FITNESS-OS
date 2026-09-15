import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetRow } from './SetRow'
import type { WorkoutSet } from '@/types/workout'

const baseSet: WorkoutSet = { id: 'set-1', setNumber: 1, weightKg: 60, reps: 8, completed: false }

describe('SetRow', () => {
  it('renders the current weight and reps', () => {
    render(<SetRow set={baseSet} onChange={() => {}} />)
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8')).toBeInTheDocument()
  })

  it('reports weight changes without touching reps or completion', () => {
    const handleChange = vi.fn()
    render(<SetRow set={baseSet} onChange={handleChange} />)

    // A single change event, since this is a controlled input whose displayed
    // value always reflects the fixed `set` prop in this isolated test.
    fireEvent.change(screen.getByLabelText('Weight for set 1 in kilograms'), { target: { value: '65' } })

    expect(handleChange).toHaveBeenLastCalledWith({ weightKg: 65 })
  })

  it('toggles completion when the check button is pressed', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<SetRow set={baseSet} onChange={handleChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Mark set 1 as done' }))

    expect(handleChange).toHaveBeenCalledWith({ completed: true })
  })

  it('reflects a completed set with the checked state', () => {
    render(<SetRow set={{ ...baseSet, completed: true }} onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Mark set 1 as not done' })).toHaveAttribute('aria-checked', 'true')
  })
})
