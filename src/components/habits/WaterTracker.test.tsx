import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WaterTracker } from './WaterTracker'
import type { WaterGoal } from '@/types/habits'

const goal: WaterGoal = { goalMl: 2500, preferredUnit: 'l' }

describe('WaterTracker', () => {
  it('renders the current total against the goal', () => {
    render(<WaterTracker logs={[]} goal={goal} onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
    expect(screen.getByText('0 L')).toBeInTheDocument()
    expect(screen.getByText('/ 2.5 L')).toBeInTheDocument()
  })

  it('calls onAdd with the right amount for each quick-add button', async () => {
    const user = userEvent.setup()
    const handleAdd = vi.fn()
    render(<WaterTracker logs={[]} goal={goal} onAdd={handleAdd} onUndo={() => {}} onEditGoal={() => {}} />)

    await user.click(screen.getByRole('button', { name: '250 ml' }))
    await user.click(screen.getByRole('button', { name: '500 ml' }))
    await user.click(screen.getByRole('button', { name: '750 ml' }))

    expect(handleAdd).toHaveBeenNthCalledWith(1, 250)
    expect(handleAdd).toHaveBeenNthCalledWith(2, 500)
    expect(handleAdd).toHaveBeenNthCalledWith(3, 750)
  })

  it('adds a custom amount converted to ml', async () => {
    const user = userEvent.setup()
    const handleAdd = vi.fn()
    render(<WaterTracker logs={[]} goal={goal} onAdd={handleAdd} onUndo={() => {}} onEditGoal={() => {}} />)

    await user.type(screen.getByLabelText('Custom water amount'), '0.4')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(handleAdd).toHaveBeenCalledWith(400)
  })

  it('disables the custom add button until a positive amount is entered', () => {
    render(<WaterTracker logs={[]} goal={goal} onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('disables undo when nothing has been logged today, enabled otherwise', () => {
    const today = new Date().toISOString().slice(0, 10)
    const { rerender } = render(<WaterTracker logs={[]} goal={goal} onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
    expect(screen.getByRole('button', { name: 'Undo latest' })).toBeDisabled()

    rerender(
      <WaterTracker
        logs={[{ id: 'w1', date: today, amountMl: 250, createdAt: new Date().toISOString() }]}
        goal={goal}
        onAdd={() => {}}
        onUndo={() => {}}
        onEditGoal={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Undo latest' })).toBeEnabled()
  })

  it('calls onUndo when clicked', async () => {
    const user = userEvent.setup()
    const handleUndo = vi.fn()
    const today = new Date().toISOString().slice(0, 10)
    render(
      <WaterTracker
        logs={[{ id: 'w1', date: today, amountMl: 250, createdAt: new Date().toISOString() }]}
        goal={goal}
        onAdd={() => {}}
        onUndo={handleUndo}
        onEditGoal={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Undo latest' }))
    expect(handleUndo).toHaveBeenCalledOnce()
  })

  it('calls onEditGoal when the settings button is clicked', async () => {
    const user = userEvent.setup()
    const handleEditGoal = vi.fn()
    render(<WaterTracker logs={[]} goal={goal} onAdd={() => {}} onUndo={() => {}} onEditGoal={handleEditGoal} />)

    await user.click(screen.getByRole('button', { name: 'Edit water goal' }))
    expect(handleEditGoal).toHaveBeenCalledOnce()
  })
})
