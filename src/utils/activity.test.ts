import { describe, expect, it } from 'vitest'
import type { ActivityEntry, DailySteps } from '@/types/activity'
import {
  estimateCaloriesBurned,
  FALLBACK_BODY_WEIGHT_KG,
  getActivitiesForDate,
  getActivityHistory,
  getDailyActivitySummary,
  getStepsForDate,
  getStepsHistory,
  resolveBodyWeightKg,
} from './activity'

function makeEntry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: overrides.id ?? `entry-${Math.random()}`,
    date: '2024-06-01',
    activityType: 'running',
    intensity: 'moderate',
    metOptionId: 'running-moderate',
    durationMinutes: 30,
    estimatedCalories: 250,
    createdAt: '2024-06-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('estimateCaloriesBurned', () => {
  it('applies kcal/min = MET × bodyWeightKg × 3.5 / 200', () => {
    // 8.5 MET × 80 kg × 3.5 / 200 = 11.9 kcal/min × 30 min = 357
    expect(estimateCaloriesBurned(8.5, 80, 30)).toBe(357)
  })

  it('scales with duration (within a kcal of rounding at each step)', () => {
    // 5 MET × 70 kg × 3.5 / 200 = 6.125 kcal/min exactly, so 10 min should
    // round to very close to 10 × the 1-minute estimate, modulo per-call rounding.
    const perMinute = estimateCaloriesBurned(5, 70, 1)
    expect(estimateCaloriesBurned(5, 70, 10)).toBeCloseTo(perMinute * 10, -1)
  })

  it('never returns a negative value', () => {
    expect(estimateCaloriesBurned(0, 70, 30)).toBe(0)
  })

  it('returns 0 for zero duration', () => {
    expect(estimateCaloriesBurned(8.5, 80, 0)).toBe(0)
  })
})

describe('resolveBodyWeightKg', () => {
  it('uses the provided weight when positive', () => {
    expect(resolveBodyWeightKg(82)).toEqual({ weightKg: 82, isEstimate: false })
  })

  it('falls back to the documented estimate when no weight is on file', () => {
    expect(resolveBodyWeightKg(null)).toEqual({ weightKg: FALLBACK_BODY_WEIGHT_KG, isEstimate: true })
    expect(resolveBodyWeightKg(undefined)).toEqual({ weightKg: FALLBACK_BODY_WEIGHT_KG, isEstimate: true })
  })

  it('falls back for a non-positive weight rather than trusting corrupt data', () => {
    expect(resolveBodyWeightKg(0)).toEqual({ weightKg: FALLBACK_BODY_WEIGHT_KG, isEstimate: true })
    expect(resolveBodyWeightKg(-5)).toEqual({ weightKg: FALLBACK_BODY_WEIGHT_KG, isEstimate: true })
  })
})

describe('getActivitiesForDate / getDailyActivitySummary', () => {
  const entries = [
    makeEntry({ id: 'a', date: '2024-06-01', durationMinutes: 30, estimatedCalories: 200 }),
    makeEntry({ id: 'b', date: '2024-06-01', durationMinutes: 20, estimatedCalories: 150 }),
    makeEntry({ id: 'c', date: '2024-06-02', durationMinutes: 45, estimatedCalories: 300 }),
  ]

  it('filters to an exact calendar date', () => {
    expect(getActivitiesForDate(entries, '2024-06-01').map((e) => e.id)).toEqual(['a', 'b'])
    expect(getActivitiesForDate(entries, '2024-06-03')).toEqual([])
  })

  it('sums duration and calories for that date only', () => {
    expect(getDailyActivitySummary(entries, '2024-06-01')).toEqual({
      activityCount: 2,
      totalDurationMinutes: 50,
      totalEstimatedCalories: 350,
    })
  })

  it('never lets one date leak into another', () => {
    const day1 = getDailyActivitySummary(entries, '2024-06-01')
    const day2 = getDailyActivitySummary(entries, '2024-06-02')
    expect(day2).toEqual({ activityCount: 1, totalDurationMinutes: 45, totalEstimatedCalories: 300 })
    expect(day1.totalEstimatedCalories).not.toBe(day2.totalEstimatedCalories)
  })

  it('returns all-zero for a date with nothing logged', () => {
    expect(getDailyActivitySummary(entries, '2099-01-01')).toEqual({
      activityCount: 0,
      totalDurationMinutes: 0,
      totalEstimatedCalories: 0,
    })
  })
})

describe('getActivityHistory', () => {
  it('groups multiple entries per day and sorts ascending', () => {
    const entries = [
      makeEntry({ date: '2024-06-03', durationMinutes: 10, estimatedCalories: 50 }),
      makeEntry({ date: '2024-06-03', durationMinutes: 20, estimatedCalories: 100 }),
      makeEntry({ date: '2024-06-01', durationMinutes: 30, estimatedCalories: 200 }),
    ]
    const history = getActivityHistory(entries, 'ALL')
    expect(history).toHaveLength(2)
    expect(history[0]).toEqual({ date: '2024-06-01', activityCount: 1, totalDurationMinutes: 30, totalEstimatedCalories: 200 })
    expect(history[1]).toEqual({ date: '2024-06-03', activityCount: 2, totalDurationMinutes: 30, totalEstimatedCalories: 150 })
  })

  it('returns an empty array for no entries', () => {
    expect(getActivityHistory([], '30D')).toEqual([])
  })
})

describe('getStepsForDate', () => {
  const steps: DailySteps[] = [
    { id: 's1', date: '2024-06-01', steps: 8000, source: 'manual', createdAt: '2024-06-01T22:00:00.000Z' },
  ]

  it('returns the recorded count for an exact date', () => {
    expect(getStepsForDate(steps, '2024-06-01')).toBe(8000)
  })

  it('returns 0 for a date with nothing recorded, never negative', () => {
    expect(getStepsForDate(steps, '2024-06-02')).toBe(0)
    expect(getStepsForDate([], '2024-06-02')).toBe(0)
  })
})

describe('getStepsHistory', () => {
  it('sorts by date ascending within the range', () => {
    const steps: DailySteps[] = [
      { id: 's1', date: '2024-06-03', steps: 9000, source: 'manual', createdAt: '2024-06-03T22:00:00.000Z' },
      { id: 's2', date: '2024-06-01', steps: 7000, source: 'manual', createdAt: '2024-06-01T22:00:00.000Z' },
    ]
    expect(getStepsHistory(steps, 'ALL')).toEqual([
      { date: '2024-06-01', steps: 7000 },
      { date: '2024-06-03', steps: 9000 },
    ])
  })

  it('returns an empty array for no steps', () => {
    expect(getStepsHistory([], '7D')).toEqual([])
  })
})
