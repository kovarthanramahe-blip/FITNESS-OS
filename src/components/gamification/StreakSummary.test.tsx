import { render, screen } from '@testing-library/react'
import { CheckCircle2, Droplets, Flame } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { StreakSummary } from './StreakSummary'
import type { StreakSummaryItem } from '@/types/gamification'

const STREAKS: StreakSummaryItem[] = [
  { key: 'workout', label: 'Workout', value: 5, unit: 'weeks', icon: Flame },
  { key: 'water', label: 'Water', value: 8, unit: 'days', icon: Droplets },
  { key: 'habits', label: 'Habits', value: 6, unit: 'days', icon: CheckCircle2 },
]

describe('StreakSummary', () => {
  it('shows each streak as a clearly distinguished value + unit', () => {
    render(<StreakSummary streaks={STREAKS} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Workout')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
    expect(screen.getByText('Habits')).toBeInTheDocument()
  })
})
