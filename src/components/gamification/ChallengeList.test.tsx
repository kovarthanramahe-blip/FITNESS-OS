import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeList } from './ChallengeList'
import type { ChallengeProgress } from '@/types/gamification'

const PROGRESS: ChallengeProgress = {
  instanceId: 'daily-water-2024-06-01',
  challenge: {
    id: 'daily-water',
    name: 'Reach your water goal today',
    description: 'Hit your daily water target.',
    period: 'daily',
    metric: 'water_goal_days',
    target: 1,
    xpReward: 30,
    requiresScheduledActivity: false,
  },
  periodKey: '2024-06-01',
  current: 0,
  target: 1,
  percent: 0,
  completed: false,
  remaining: 1,
}

describe('ChallengeList', () => {
  it('renders a heading and one card per challenge', () => {
    render(<ChallengeList title="Today" challenges={[PROGRESS]} />)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText('Reach your water goal today')).toBeInTheDocument()
  })

  it('shows an empty state with no challenges', () => {
    render(<ChallengeList title="Today" challenges={[]} emptyMessage="Nothing scheduled" />)
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument()
  })
})
