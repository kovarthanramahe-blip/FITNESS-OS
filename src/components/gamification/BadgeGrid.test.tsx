import { render, screen } from '@testing-library/react'
import { Dumbbell } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { BadgeGrid } from './BadgeGrid'
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

describe('BadgeGrid', () => {
  it('renders one card per item', () => {
    render(
      <BadgeGrid
        items={[
          { badge: BADGE, earned: true, earnedAt: '2024-06-01T00:00:00.000Z' },
          { badge: { ...BADGE, id: 'week-one', name: 'Week One' }, earned: false },
        ]}
      />,
    )
    expect(screen.getByText('First Workout')).toBeInTheDocument()
    expect(screen.getByText('Week One')).toBeInTheDocument()
  })

  it('shows an empty state when there are no matching badges', () => {
    render(<BadgeGrid items={[]} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})
