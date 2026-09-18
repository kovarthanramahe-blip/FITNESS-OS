import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WaterTracker } from './WaterTracker'
import type { WaterGoal } from '@/types/nutrition'

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

  describe('date prop (regression: water must respect the page\'s selected date, not always "today")', () => {
    const logs = [
      { id: 'w-yesterday', date: '2026-09-17', amountMl: 3500, createdAt: '2026-09-17T08:00:00.000Z' },
      { id: 'w-today', date: '2026-09-18', amountMl: 4000, createdAt: '2026-09-18T08:00:00.000Z' },
    ]

    it('shows the total for the given date, not always today\'s total', () => {
      render(<WaterTracker logs={logs} goal={goal} date="2026-09-17" onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
      // 3500 ml in liters, per the fixture above — never 4.0 L (that date's own total).
      expect(screen.getByTestId('water-total')).toHaveTextContent('3.5 L')
    })

    it('enables/disables undo based on the given date\'s own logs, independent of other dates', () => {
      render(<WaterTracker logs={logs} goal={goal} date="2099-01-01" onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
      // No logs exist for 2099-01-01, even though both fixture dates have entries.
      expect(screen.getByRole('button', { name: 'Undo latest' })).toBeDisabled()
    })

    it('labels the card with the date when viewing a non-today date', () => {
      render(<WaterTracker logs={logs} goal={goal} date="2026-09-17" onAdd={() => {}} onUndo={() => {}} onEditGoal={() => {}} />)
      expect(screen.getByText('Water · 2026-09-17')).toBeInTheDocument()
    })

    it('defaults to today when no date prop is given (unchanged behavior for callers without date navigation)', () => {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      render(
        <WaterTracker
          logs={[{ id: 'w1', date: todayStr, amountMl: 1000, createdAt: new Date().toISOString() }]}
          goal={goal}
          onAdd={() => {}}
          onUndo={() => {}}
          onEditGoal={() => {}}
        />,
      )
      expect(screen.getByText('Water')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Undo latest' })).toBeEnabled()
    })
  })
})
