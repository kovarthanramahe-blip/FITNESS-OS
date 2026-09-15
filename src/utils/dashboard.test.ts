import { describe, expect, it } from 'vitest'
import { getRemaining, getScoreLabel, getWeeklyActivityFromHistory, getWeightTrendStatus } from './dashboard'
import type { WorkoutHistoryEntry } from '@/types/workout'
import { toDateString } from './dateRange'

describe('getScoreLabel', () => {
  it('labels scores across the range', () => {
    expect(getScoreLabel(90, 100)).toBe('Excellent day')
    expect(getScoreLabel(78, 100)).toBe('Great day')
    expect(getScoreLabel(55, 100)).toBe('Good progress')
    expect(getScoreLabel(20, 100)).toBe("Let's build momentum")
  })
})

describe('getRemaining', () => {
  it('returns the positive difference', () => {
    expect(getRemaining(1680, 2200)).toBe(520)
  })

  it('never returns a negative amount', () => {
    expect(getRemaining(2500, 2200)).toBe(0)
  })
})

describe('getWeightTrendStatus', () => {
  it('is positive when the change moves toward the target', () => {
    expect(getWeightTrendStatus(-0.6, 72.4, 68)).toBe('positive')
  })

  it('is negative when the change moves away from the target', () => {
    expect(getWeightTrendStatus(0.6, 72.4, 68)).toBe('negative')
  })

  it('is neutral when there is no change', () => {
    expect(getWeightTrendStatus(0, 72.4, 68)).toBe('neutral')
  })
})

function buildEntry(date: string, overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
  return {
    id: `history-${date}`,
    sessionId: `session-${date}`,
    date,
    name: 'Push Day',
    durationMinutes: 45,
    volumeKg: 2000,
    exerciseCount: 5,
    setCount: 15,
    personalRecordCount: 0,
    estimatedCalories: 300,
    ...overrides,
  }
}

describe('getWeeklyActivityFromHistory', () => {
  const today = new Date('2024-06-14T12:00:00')

  it('returns 7 days ending today with no fabricated numbers when history is empty', () => {
    const days = getWeeklyActivityFromHistory([], today)
    expect(days).toHaveLength(7)
    expect(days.every((day) => day.workoutMinutes === 0 && day.caloriesBurned === 0)).toBe(true)
    expect(days[6]?.status).toBe('upcoming')
    expect(days.slice(0, 6).every((day) => day.status === 'missed')).toBe(true)
  })

  it('marks a day complete only when a real history entry exists for it', () => {
    const days = getWeeklyActivityFromHistory([buildEntry(toDateString(today))], today)
    expect(days[6]).toMatchObject({ status: 'complete', workoutMinutes: 45, caloriesBurned: 300 })
  })

  it('uses the real duration and calorie estimate from the matching entry', () => {
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const days = getWeeklyActivityFromHistory(
      [buildEntry(toDateString(threeDaysAgo), { durationMinutes: 60, estimatedCalories: 420 })],
      today,
    )
    expect(days[3]).toMatchObject({ status: 'complete', workoutMinutes: 60, caloriesBurned: 420 })
  })

  it('ignores history entries outside the 7-day window', () => {
    const longAgo = new Date(today)
    longAgo.setDate(longAgo.getDate() - 30)
    const days = getWeeklyActivityFromHistory([buildEntry(toDateString(longAgo))], today)
    expect(days.every((day) => day.status !== 'complete')).toBe(true)
  })
})
