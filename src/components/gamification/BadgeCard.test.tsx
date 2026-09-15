import { render, screen } from '@testing-library/react'
import { Dumbbell } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { BadgeCard } from './BadgeCard'
import type { Badge } from '@/types/gamification'

const BADGE: Badge = {
  id: 'first-workout',
  name: 'First Workout',
  description: 'Complete your first workout.',
  category: 'workout',
  icon: Dumbbell,
  requirement: 'Complete 1 workout',
  rarity: 'common',
}

describe('BadgeCard', () => {
  it('shows the badge name and description when earned', () => {
    render(<BadgeCard badge={BADGE} earned earnedAt="2024-06-01T00:00:00.000Z" />)
    expect(screen.getByText('First Workout')).toBeInTheDocument()
    expect(screen.getByText('Complete your first workout.')).toBeInTheDocument()
  })

  it('shows the requirement text instead of the description when locked', () => {
    render(<BadgeCard badge={BADGE} earned={false} />)
    expect(screen.getByText('Complete 1 workout')).toBeInTheDocument()
    expect(screen.queryByText('Complete your first workout.')).not.toBeInTheDocument()
  })

  it('exposes an accessible label that conveys earned/locked state without relying on color', () => {
    render(<BadgeCard badge={BADGE} earned={false} />)
    expect(screen.getByRole('group', { name: /locked/i })).toBeInTheDocument()
  })

  it('shows the rarity as visible text, not just color', () => {
    render(<BadgeCard badge={BADGE} earned />)
    expect(screen.getByText('Common')).toBeInTheDocument()
  })
})
