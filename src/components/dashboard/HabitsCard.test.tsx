import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Droplets, Dumbbell } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HabitsCard } from './HabitsCard'

const habits = [
  { id: 'workout', label: 'Complete workout', icon: Dumbbell, completed: false },
  { id: 'water', label: 'Drink 3L water', icon: Droplets, completed: true },
]

function renderHabitsCard() {
  return render(
    <MemoryRouter>
      <HabitsCard habits={habits} />
    </MemoryRouter>,
  )
}

describe('HabitsCard', () => {
  it('renders each habit with its completion state', () => {
    renderHabitsCard()

    expect(screen.getByText('1 of 2 done today')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Mark Complete workout as done' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByRole('checkbox', { name: 'Mark Drink 3L water as not done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('toggles a habit to complete when clicked', async () => {
    const user = userEvent.setup()
    renderHabitsCard()

    await user.click(screen.getByRole('checkbox', { name: 'Mark Complete workout as done' }))

    expect(screen.getByRole('checkbox', { name: 'Mark Complete workout as not done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText('2 of 2 done today')).toBeInTheDocument()
  })
})
