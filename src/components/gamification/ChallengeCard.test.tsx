import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeCard } from './ChallengeCard'
import type { ChallengeProgress } from '@/types/gamification'

const BASE_PROGRESS: ChallengeProgress = {
  instanceId: 'daily-workout-2024-06-01',
  challenge: {
    id: 'daily-workout',
    name: 'Complete a workout today',
    description: "Finish today's scheduled workout.",
    period: 'daily',
    metric: 'workout_count',
    target: 1,
    xpReward: 30,
    requiresScheduledActivity: true,
  },
  periodKey: '2024-06-01',
  current: 0,
  target: 1,
  percent: 0,
  completed: false,
  remaining: 1,
}

describe('ChallengeCard', () => {
  it('shows progress and the XP reward when not completed', () => {
    render(<ChallengeCard progress={BASE_PROGRESS} />)
    expect(screen.getByText('Complete a workout today')).toBeInTheDocument()
    expect(screen.getByText('+30 XP')).toBeInTheDocument()
    expect(screen.getByText('0 / 1 workouts')).toBeInTheDocument()
  })

  it('shows a completed state instead of the XP pill once done', () => {
    render(<ChallengeCard progress={{ ...BASE_PROGRESS, current: 1, percent: 100, completed: true, remaining: 0 }} />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.queryByText('+30 XP')).not.toBeInTheDocument()
  })

  it('exposes progress via the progressbar role, capped at 100', () => {
    render(<ChallengeCard progress={{ ...BASE_PROGRESS, current: 5, target: 1, percent: 100, completed: true, remaining: 0 }} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})
