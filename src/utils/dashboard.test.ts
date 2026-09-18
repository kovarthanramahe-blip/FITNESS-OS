import { describe, expect, it } from 'vitest'
import { getNextAction, getRemaining, getScoreLabel, getWeeklyActivityFromHistory, getWeightTrendStatus } from './dashboard'
import type { NextActionInput } from './dashboard'
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

describe('getNextAction', () => {
  // Every signal "on track" by default — individual tests knock exactly
  // one out of range to prove the priority order in isolation.
  const ALL_ON_TRACK: NextActionInput = {
    hasWorkoutScheduledToday: true,
    workoutCompletedToday: true,
    proteinConsumed: 150,
    proteinTarget: 150,
    waterConsumedMl: 2500,
    waterGoalMl: 2500,
    nextIncompleteHabitName: null,
  }

  it('returns null when every signal is already on track — never invents a recommendation', () => {
    expect(getNextAction(ALL_ON_TRACK)).toBeNull()
  })

  it('prioritizes an incomplete scheduled workout above everything else', () => {
    const action = getNextAction({
      ...ALL_ON_TRACK,
      workoutCompletedToday: false,
      proteinConsumed: 10, // also behind, but workout must still win
    })
    expect(action).toMatchObject({ id: 'workout', href: '/workout' })
  })

  it('does not suggest a workout on a rest day, even if nothing else has happened yet', () => {
    const action = getNextAction({
      ...ALL_ON_TRACK,
      hasWorkoutScheduledToday: false,
      workoutCompletedToday: false,
    })
    expect(action?.id).not.toBe('workout')
  })

  it('suggests logging protein when significantly below target (workout already done)', () => {
    const action = getNextAction({ ...ALL_ON_TRACK, proteinConsumed: 50, proteinTarget: 150 })
    expect(action).toMatchObject({ id: 'protein', href: '/nutrition' })
    expect(action?.description).toContain('100g')
  })

  it('does not flag protein merely for being slightly under target', () => {
    // 120/150 = 80%, above the "significantly behind" threshold.
    const action = getNextAction({ ...ALL_ON_TRACK, proteinConsumed: 120, proteinTarget: 150 })
    expect(action).toBeNull()
  })

  it('suggests logging water once workout and protein are on track', () => {
    const action = getNextAction({ ...ALL_ON_TRACK, waterConsumedMl: 1000, waterGoalMl: 2500 })
    expect(action).toMatchObject({ id: 'water', href: '/nutrition' })
    expect(action?.description).toContain('1.5L')
  })

  it('suggests the next incomplete habit once workout, protein, and water are all on track', () => {
    const action = getNextAction({ ...ALL_ON_TRACK, nextIncompleteHabitName: 'Read 10 pages' })
    expect(action).toMatchObject({ id: 'habit', href: '/habits' })
    expect(action?.title).toContain('Read 10 pages')
  })

  it('never suggests water/protein when no goal is set (target 0 is not "behind")', () => {
    const action = getNextAction({
      ...ALL_ON_TRACK,
      proteinConsumed: 0,
      proteinTarget: 0,
      waterConsumedMl: 0,
      waterGoalMl: 0,
    })
    expect(action).toBeNull()
  })
})
