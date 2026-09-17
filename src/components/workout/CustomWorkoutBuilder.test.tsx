import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomWorkoutBuilder } from './CustomWorkoutBuilder'

describe('CustomWorkoutBuilder — numeric field focus (regression: Android keyboard dismissal)', () => {
  it('the sets input retains focus across value updates while the user is entering a number', async () => {
    const user = userEvent.setup()
    render(<CustomWorkoutBuilder isOpen onClose={vi.fn()} onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    const setsInput = screen.getByLabelText(/Sets for/)

    await user.click(setsInput)
    expect(setsInput).toHaveFocus()

    await user.type(setsInput, '2')
    expect(setsInput).toHaveFocus()
  })

  it('multiple numeric fields can be edited in turn without unexpected focus loss', async () => {
    const user = userEvent.setup()
    render(<CustomWorkoutBuilder isOpen onClose={vi.fn()} onSave={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const setsInputs = screen.getAllByLabelText(/Sets for/)
    const repsInputs = screen.getAllByLabelText(/Reps for/)
    expect(setsInputs).toHaveLength(2)

    await user.click(setsInputs[0]!)
    await user.type(setsInputs[0]!, '5')
    expect(setsInputs[0]).toHaveFocus()

    await user.click(repsInputs[0]!)
    await user.type(repsInputs[0]!, '10')
    expect(repsInputs[0]).toHaveFocus()

    await user.click(setsInputs[1]!)
    await user.type(setsInputs[1]!, '3')
    expect(setsInputs[1]).toHaveFocus()
  })

  it('entering a name and adding exercises does not lose focus on the name field either', async () => {
    const user = userEvent.setup()
    render(<CustomWorkoutBuilder isOpen onClose={vi.fn()} onSave={vi.fn()} />)

    const nameInput = screen.getByLabelText('Workout name')
    await user.click(nameInput)
    await user.type(nameInput, 'Arm Day')

    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveValue('Arm Day')
  })
})
