import { describe, expect, it } from 'vitest'
import { buildChallengeCompletionEvent, getDailyChallengeProgress, getWeeklyChallengeProgress } from './challengeEngine'
import type { ActivitySnapshot } from './gamification'
import type { Habit, HabitEntry } from '@/types/habits'
import { getTodayDateString } from '@/utils/dateRange'

const NOW = new Date('2024-06-10T12:00:00.000Z')
const TODAY = getTodayDateString(NOW)

function emptySnapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    workoutHistory: [],
    personalRecords: [],
    foodEntries: [],
    habits: [],
    habitEntries: [],
    waterLogs: [],
    waterGoal: { goalMl: 2000, preferredUnit: 'l' },
    weightLogs: [],
    measurements: [],
    todayProgramDayType: null,
    now: NOW,
    ...overrides,
  }
}

function findDaily(snapshot: ActivitySnapshot, challengeId: string) {
  return getDailyChallengeProgress(snapshot).find((p) => p.challenge.id === challengeId)
}

describe('daily challenges — schedule awareness', () => {
  it('does not include the workout challenge on a rest day', () => {
    const snapshot = emptySnapshot({ todayProgramDayType: 'rest' })
    expect(findDaily(snapshot, 'daily-workout')).toBeUndefined()
  })

  it('includes the workout challenge on a workout day, starting at 0/1', () => {
    const snapshot = emptySnapshot({ todayProgramDayType: 'workout' })
    const progress = findDaily(snapshot, 'daily-workout')!
    expect(progress.current).toBe(0)
    expect(progress.target).toBe(1)
    expect(progress.completed).toBe(false)
  })

  it('completes the workout challenge once a session is logged today', () => {
    const snapshot = emptySnapshot({
      todayProgramDayType: 'workout',
      workoutHistory: [{ id: 'h1', sessionId: 's1', date: `${TODAY}T18:00:00.000Z`, name: 'Push A', durationMinutes: 40, volumeKg: 500, exerciseCount: 4, setCount: 12, personalRecordCount: 0, estimatedCalories: 300 }],
    })
    const progress = findDaily(snapshot, 'daily-workout')!
    expect(progress.current).toBe(1)
    expect(progress.completed).toBe(true)
  })

  it('does not include the habits challenge when nothing is scheduled today', () => {
    expect(findDaily(emptySnapshot(), 'daily-habits')).toBeUndefined()
  })

  it('always includes water/nutrition/weight challenges (no schedule concept)', () => {
    const snapshot = emptySnapshot()
    expect(findDaily(snapshot, 'daily-water')).toBeDefined()
    expect(findDaily(snapshot, 'daily-nutrition')).toBeDefined()
    expect(findDaily(snapshot, 'daily-weight')).toBeDefined()
  })
})

describe('challenge progress bounds', () => {
  it('never exceeds 100% even when current overshoots target', () => {
    const base = { foodId: 'f', foodName: 'Food', quantity: 1, servingUnit: 'serving', calories: 100, protein: 1, carbohydrates: 1, fat: 1, fiber: 1, date: TODAY, createdAt: '' }
    const snapshot = emptySnapshot({
      foodEntries: [
        { ...base, id: 'f1', meal: 'breakfast' },
        { ...base, id: 'f2', meal: 'lunch' },
        { ...base, id: 'f3', meal: 'dinner' },
        { ...base, id: 'f4', meal: 'snacks' },
      ],
    })
    const progress = findDaily(snapshot, 'daily-nutrition')!
    expect(progress.current).toBe(4)
    expect(progress.target).toBe(3)
    expect(progress.percent).toBe(100)
    expect(progress.remaining).toBe(0)
    expect(progress.completed).toBe(true)
  })
})

describe('weekly challenges', () => {
  it('counts workouts completed within the current week', () => {
    const monday = getTodayDateString(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - (NOW.getDay() === 0 ? 6 : NOW.getDay() - 1)))
    const snapshot = emptySnapshot({
      workoutHistory: [
        { id: 'h1', sessionId: 's1', date: `${monday}T18:00:00.000Z`, name: 'A', durationMinutes: 40, volumeKg: 100, exerciseCount: 1, setCount: 1, personalRecordCount: 0, estimatedCalories: 100 },
        { id: 'h2', sessionId: 's2', date: `${TODAY}T18:00:00.000Z`, name: 'B', durationMinutes: 40, volumeKg: 100, exerciseCount: 1, setCount: 1, personalRecordCount: 0, estimatedCalories: 100 },
      ],
    })
    const progress = getWeeklyChallengeProgress(snapshot).find((p) => p.challenge.id === 'weekly-workouts')!
    expect(progress.current).toBe(2)
    expect(progress.target).toBe(3)
    expect(progress.completed).toBe(false)
  })

  it('computes habit_completion as a percent for the weekly habits challenge', () => {
    const habit: Habit = { id: 'a', name: 'A', icon: 'sparkles', category: 'wellness', frequency: { type: 'daily' }, target: 1, reminderEnabled: false, active: true, createdAt: '2024-01-01T00:00:00.000Z' }
    const entries: HabitEntry[] = [{ id: 'e1', habitId: 'a', date: TODAY, completedAt: '' }]
    const snapshot = emptySnapshot({ habits: [habit], habitEntries: entries })
    const progress = getWeeklyChallengeProgress(snapshot).find((p) => p.challenge.id === 'weekly-habits')!
    expect(progress.current).toBeGreaterThan(0)
    expect(progress.current).toBeLessThanOrEqual(100)
  })
})

describe('buildChallengeCompletionEvent', () => {
  it('builds a stable, typed XP event from a completed instance', () => {
    const snapshot = emptySnapshot({ todayProgramDayType: 'workout', workoutHistory: [{ id: 'h1', sessionId: 's1', date: `${TODAY}T18:00:00.000Z`, name: 'Push A', durationMinutes: 40, volumeKg: 500, exerciseCount: 4, setCount: 12, personalRecordCount: 0, estimatedCalories: 300 }] })
    const progress = findDaily(snapshot, 'daily-workout')!
    const event = buildChallengeCompletionEvent(progress)
    expect(event.id).toBe(`challenge-${progress.instanceId}`)
    expect(event.type).toBe('challenge_daily_complete')
    expect(event.amount).toBe(progress.challenge.xpReward)
  })
})
