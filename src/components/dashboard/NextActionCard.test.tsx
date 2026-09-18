import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NextActionCard } from './NextActionCard'
import type { NextAction } from '@/utils/dashboard'

function renderCard(action: NextAction | null) {
  return render(
    <MemoryRouter>
      <NextActionCard action={action} />
    </MemoryRouter>,
  )
}

describe('NextActionCard', () => {
  it('shows an "all caught up" state when there is no action', () => {
    renderCard(null)
    expect(screen.getByText('All caught up for today')).toBeInTheDocument()
    expect(screen.queryByText('Next up')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders the action title, description, and a link to the right section', () => {
    const action: NextAction = {
      id: 'protein',
      title: 'Log protein',
      description: '40g remaining to hit today\'s target',
      href: '/nutrition',
    }
    renderCard(action)

    expect(screen.getByText('Next up')).toBeInTheDocument()
    expect(screen.getByText('Log protein')).toBeInTheDocument()
    expect(screen.getByText("40g remaining to hit today's target")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go/ })).toHaveAttribute('href', '/nutrition')
  })

  it('links to the workout section for a workout action', () => {
    renderCard({ id: 'workout', title: "Start today's workout", description: 'x', href: '/workout' })
    expect(screen.getByRole('link', { name: /Go/ })).toHaveAttribute('href', '/workout')
  })

  it('links to the habits section for a habit action', () => {
    renderCard({ id: 'habit', title: 'Complete "Stretch"', description: 'x', href: '/habits' })
    expect(screen.getByRole('link', { name: /Go/ })).toHaveAttribute('href', '/habits')
  })
})
