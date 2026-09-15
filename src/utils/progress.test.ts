import { describe, expect, it } from 'vitest'
import {
  getAverageWeeklyChangeKg,
  getCurrentWeightLog,
  getHighestWeightLog,
  getLowestWeightLog,
  getMonthlyVolumeKg,
  getStrengthProgress,
  getTargetProgressPercent,
  getVolumeInRangeKg,
  getWeeklyFrequency,
  getWeeklyVolumeKg,
  getWeightChangeKg,
  getWeightChangeOverDays,
  getWorkoutAnalytics,
  isChangeTowardGoal,
  isWithinRange,
} from './progress'
import type { PersonalRecord, WeightLog } from '@/types/progress'
import type { WorkoutExercise, WorkoutHistoryEntry, WorkoutSession, WorkoutSet } from '@/types/workout'

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function weightLog(daysAgo: number, weightKg: number): WeightLog {
  return { id: `w-${daysAgo}`, date: isoDaysAgo(daysAgo), weightKg }
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: 'set', setNumber: 1, weightKg: 60, reps: 8, completed: true, ...overrides }
}

function makeSession(
  daysAgo: number,
  exerciseId: string,
  sets: WorkoutSet[],
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  const completedAt = new Date()
  completedAt.setDate(completedAt.getDate() - daysAgo)
  const exercise: WorkoutExercise = {
    id: `${exerciseId}-ex`,
    exerciseId,
    name: exerciseId,
    muscleGroup: 'Chest',
    targetReps: '6-10',
    restSeconds: 90,
    sets,
  }
  return {
    id: `session-${daysAgo}`,
    name: 'Session',
    level: 'Intermediate',
    startedAt: completedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    exercises: [exercise],
    ...overrides,
  }
}

describe('isWithinRange / filterByRange', () => {
  it('treats ALL as always within range', () => {
    expect(isWithinRange(isoDaysAgo(1000), 'ALL')).toBe(true)
  })

  it('excludes dates older than the range window', () => {
    expect(isWithinRange(isoDaysAgo(10), '7D')).toBe(false)
    expect(isWithinRange(isoDaysAgo(3), '7D')).toBe(true)
  })
})

describe('weight change', () => {
  it('is the simple difference, rounded to one decimal', () => {
    expect(getWeightChangeKg(72.4, 78)).toBeCloseTo(-5.6, 5)
  })

  it('is zero for no change', () => {
    expect(getWeightChangeKg(70, 70)).toBe(0)
  })
})

describe('target progress', () => {
  it('measures weight-loss progress correctly', () => {
    // starting 78, target 68, current 72.4 -> lost 5.6 of 10 needed = 56%
    expect(getTargetProgressPercent(72.4, 78, 68)).toBeCloseTo(56, 5)
  })

  it('measures weight-gain progress correctly without assuming loss is the goal', () => {
    // starting 60, target 70, current 65 -> gained 5 of 10 needed = 50%
    expect(getTargetProgressPercent(65, 60, 70)).toBe(50)
  })

  it('clamps progress at 100% once the target is reached or passed', () => {
    expect(getTargetProgressPercent(66, 78, 68)).toBe(100)
  })

  it('clamps progress at 0% if moving the wrong direction', () => {
    expect(getTargetProgressPercent(80, 78, 68)).toBe(0)
  })

  it('returns null when starting equals target and current has not reached it', () => {
    expect(getTargetProgressPercent(75, 70, 70)).toBeNull()
  })

  it('returns 100 when starting equals target and current is already there', () => {
    expect(getTargetProgressPercent(70, 70, 70)).toBe(100)
  })
})

describe('isChangeTowardGoal', () => {
  it('is true for weight lost toward a lower target', () => {
    expect(isChangeTowardGoal(-1, 78, 68)).toBe(true)
  })

  it('is true for weight gained toward a higher target', () => {
    expect(isChangeTowardGoal(1, 60, 70)).toBe(true)
  })

  it('is false when moving away from the goal', () => {
    expect(isChangeTowardGoal(1, 78, 68)).toBe(false)
  })

  it('is false for no change', () => {
    expect(isChangeTowardGoal(0, 78, 68)).toBe(false)
  })
})

describe('average weekly change', () => {
  it('returns null with fewer than two entries', () => {
    expect(getAverageWeeklyChangeKg([])).toBeNull()
    expect(getAverageWeeklyChangeKg([weightLog(0, 70)])).toBeNull()
  })

  it('returns null when the log spans less than a week', () => {
    expect(getAverageWeeklyChangeKg([weightLog(3, 71), weightLog(0, 70)])).toBeNull()
  })

  it('computes a weekly rate once there is enough history', () => {
    // 14 days, -2.0 kg total -> -1.0 kg/week
    const result = getAverageWeeklyChangeKg([weightLog(14, 72), weightLog(0, 70)])
    expect(result).toBeCloseTo(-1, 5)
  })

  it('handles duplicate dates without throwing', () => {
    const logs = [weightLog(14, 72), weightLog(14, 72.2), weightLog(0, 70)]
    expect(() => getAverageWeeklyChangeKg(logs)).not.toThrow()
  })
})

describe('min/max weight', () => {
  it('returns null for an empty list', () => {
    expect(getLowestWeightLog([])).toBeNull()
    expect(getHighestWeightLog([])).toBeNull()
  })

  it('finds the lowest and highest recorded weight', () => {
    const logs = [weightLog(20, 80), weightLog(10, 75), weightLog(0, 77)]
    expect(getLowestWeightLog(logs)?.weightKg).toBe(75)
    expect(getHighestWeightLog(logs)?.weightKg).toBe(80)
  })
})

describe('getCurrentWeightLog / getWeightChangeOverDays', () => {
  it('returns null for an empty log', () => {
    expect(getCurrentWeightLog([])).toBeNull()
    expect(getWeightChangeOverDays([], 30)).toBeNull()
  })

  it('picks the most recent entry as current', () => {
    const logs = [weightLog(10, 75), weightLog(0, 73)]
    expect(getCurrentWeightLog(logs)?.weightKg).toBe(73)
  })

  it('returns null when only one point falls within the window', () => {
    expect(getWeightChangeOverDays([weightLog(0, 73)], 30)).toBeNull()
  })

  it('computes the change across the window when enough points exist', () => {
    // Kept a couple of days clear of the 30-day boundary so this isn't
    // sensitive to the time-of-day the test happens to run at.
    const logs = [weightLog(27, 75), weightLog(15, 74), weightLog(0, 73)]
    expect(getWeightChangeOverDays(logs, 30)).toBeCloseTo(-2, 5)
  })
})

describe('training volume', () => {
  it('is zero for no sessions', () => {
    expect(getVolumeInRangeKg([], 'ALL')).toBe(0)
  })

  it('only counts completed sets', () => {
    const session = makeSession(0, 'bench-press', [
      makeSet({ weightKg: 60, reps: 8, completed: true }),
      makeSet({ id: 's2', weightKg: 65, reps: 5, completed: false }),
    ])
    expect(getVolumeInRangeKg([session], 'ALL')).toBe(480)
  })

  it('excludes sessions outside the requested range', () => {
    const recent = makeSession(1, 'bench-press', [makeSet({ weightKg: 60, reps: 8 })])
    const old = makeSession(60, 'bench-press', [makeSet({ weightKg: 100, reps: 10 })])
    expect(getVolumeInRangeKg([recent, old], '7D')).toBe(480)
  })

  it('ignores sessions that were never completed', () => {
    const inProgress = makeSession(0, 'bench-press', [makeSet()], { completedAt: undefined })
    expect(getVolumeInRangeKg([inProgress], 'ALL')).toBe(0)
  })
})

describe('weekly / monthly volume', () => {
  it('weekly volume only includes the last 7 days', () => {
    const inWeek = makeSession(2, 'squat', [makeSet({ weightKg: 80, reps: 5 })])
    const outsideWeek = makeSession(10, 'squat', [makeSet({ weightKg: 80, reps: 5 })])
    expect(getWeeklyVolumeKg([inWeek, outsideWeek])).toBe(400)
  })

  it('monthly volume covers the last 30 days', () => {
    const inMonth = makeSession(20, 'squat', [makeSet({ weightKg: 80, reps: 5 })])
    const outsideMonth = makeSession(40, 'squat', [makeSet({ weightKg: 80, reps: 5 })])
    expect(getMonthlyVolumeKg([inMonth, outsideMonth])).toBe(400)
  })
})

describe('strength progression', () => {
  it('returns an empty-but-valid summary for an untrained exercise', () => {
    const result = getStrengthProgress('bench-press', [], [])
    expect(result.history).toEqual([])
    expect(result.currentBest).toBeNull()
    expect(result.estimatedOneRepMax).toBeNull()
    expect(result.totalVolumeKg).toBe(0)
  })

  it('tracks current vs previous best across sessions', () => {
    const older = makeSession(10, 'bench-press', [makeSet({ weightKg: 60, reps: 8 })])
    const recent = makeSession(2, 'bench-press', [makeSet({ weightKg: 62.5, reps: 6 })])

    const result = getStrengthProgress('bench-press', [older, recent], [])

    expect(result.currentBest).toEqual(expect.objectContaining({ weightKg: 62.5, reps: 6 }))
    expect(result.previousBest).toEqual(expect.objectContaining({ weightKg: 60, reps: 8 }))
    expect(result.history).toHaveLength(2)
    expect(result.estimatedOneRepMax).toBeGreaterThan(0)
  })

  it('sums volume from completed sets only, across every matching session', () => {
    const session = makeSession(0, 'bench-press', [
      makeSet({ weightKg: 60, reps: 8, completed: true }),
      makeSet({ id: 's2', weightKg: 60, reps: 8, completed: true }),
    ])
    const result = getStrengthProgress('bench-press', [session], [])
    expect(result.totalVolumeKg).toBe(960)
  })

  it('counts personal records scoped to the exercise', () => {
    const records: PersonalRecord[] = [
      { id: 'pr1', exercise: 'Bench Press', exerciseId: 'bench-press', weightKg: 60, reps: 8, date: isoDaysAgo(5) },
      { id: 'pr2', exercise: 'Squat', exerciseId: 'squat', weightKg: 100, reps: 5, date: isoDaysAgo(5) },
    ]
    const result = getStrengthProgress('bench-press', [], records)
    expect(result.personalRecordCount).toBe(1)
  })
})

describe('workout frequency', () => {
  it('marks only the days with a completed workout', () => {
    const now = new Date()
    const monday = new Date(now)
    const day = monday.getDay()
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
    const entry: WorkoutHistoryEntry = {
      id: 'h1',
      sessionId: 's1',
      date: monday.toISOString(),
      name: 'Push',
      durationMinutes: 45,
      volumeKg: 1000,
      exerciseCount: 5,
      setCount: 15,
      personalRecordCount: 0,
      estimatedCalories: 300,
    }
    const week = getWeeklyFrequency([entry], now)
    expect(week).toHaveLength(7)
    expect(week[0]?.hasWorkout).toBe(true)
    expect(week.slice(1).every((day) => !day.hasWorkout)).toBe(true)
  })

  it('returns all-false week for no history, not an error', () => {
    const week = getWeeklyFrequency([])
    expect(week.every((day) => !day.hasWorkout)).toBe(true)
  })
})

describe('workout analytics / empty data handling', () => {
  it('handles an empty history without NaN or Infinity', () => {
    const summary = getWorkoutAnalytics([], [])
    expect(summary.totalWorkouts).toBe(0)
    expect(summary.avgDurationMinutes).toBeNull()
    expect(summary.avgWeeklyVolumeKg).toBeNull()
    expect(summary.currentWeekStreak).toBe(0)
    expect(Number.isFinite(summary.totalVolumeKg)).toBe(true)
  })

  it('computes averages from real history', () => {
    const history: WorkoutHistoryEntry[] = [
      {
        id: 'h1',
        sessionId: 's1',
        date: isoDaysAgo(1),
        name: 'Push',
        durationMinutes: 40,
        volumeKg: 1000,
        exerciseCount: 5,
        setCount: 15,
        personalRecordCount: 1,
        estimatedCalories: 300,
      },
      {
        id: 'h2',
        sessionId: 's2',
        date: isoDaysAgo(3),
        name: 'Pull',
        durationMinutes: 50,
        volumeKg: 1200,
        exerciseCount: 5,
        setCount: 16,
        personalRecordCount: 0,
        estimatedCalories: 320,
      },
    ]
    const summary = getWorkoutAnalytics(history, [])
    expect(summary.totalWorkouts).toBe(2)
    expect(summary.avgDurationMinutes).toBe(45)
    expect(summary.totalVolumeKg).toBe(2200)
    expect(summary.currentWeekStreak).toBeGreaterThanOrEqual(1)
  })
})
