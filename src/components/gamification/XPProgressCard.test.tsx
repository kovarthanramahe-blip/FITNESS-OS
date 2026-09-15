import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { XPProgressCard } from './XPProgressCard'
import type { GamificationStats } from '@/types/gamification'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

const STATS: GamificationStats = {
  profile: { totalXp: 2450, currentLevel: 12, createdAt: '2024-01-01T00:00:00.000Z' },
  xpIntoLevel: 2450,
  xpForNextLevel: 3000,
  levelProgressPercent: 81.7,
  levelTitle: 'Consistency Builder',
  recentEvents: [],
  earnedBadges: [],
  lockedBadges: [],
  dailyChallenges: [],
  weeklyChallenges: [],
  streaks: [],
}

describe('XPProgressCard', () => {
  it('renders the level, title and XP progress from the stats read model', () => {
    render(<XPProgressCard stats={STATS} />)
    expect(screen.getByText('Level 12')).toBeInTheDocument()
    expect(screen.getByText('Consistency Builder')).toBeInTheDocument()
    expect(screen.getByText('2,450 / 3,000 XP')).toBeInTheDocument()
  })
})
