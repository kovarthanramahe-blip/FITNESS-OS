import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('reflects the checked state via aria-checked', () => {
    render(<Toggle checked label="Workout reminders" onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Workout reminders' })).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with the flipped value when clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Toggle checked={false} label="Supplement reminders" onChange={handleChange} />)

    await user.click(screen.getByRole('switch', { name: 'Supplement reminders' }))

    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Toggle checked={false} label="Disabled toggle" onChange={handleChange} disabled />)

    await user.click(screen.getByRole('switch', { name: 'Disabled toggle' }))

    expect(handleChange).not.toHaveBeenCalled()
  })
})
