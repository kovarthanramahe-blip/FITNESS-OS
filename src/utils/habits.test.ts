import { describe, expect, it } from 'vitest'
import type { Habit, HabitEntry, WaterLog } from '@/types/habits'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import {
  getBestStreak,
  getCompletionRate,
  getCurrentStreak,
  getDailyWaterMl,
  getHabitStats,
  getHabitStatusForDate,
  getLatestWaterLogForDate,
  getRemainingWaterMl,
  getTodaysHabitsSummary,
  getWaterGoalPercent,
  getWaterHistory,
  getWeeklyStrip,
  isHabitScheduledOn,
} from './habits'

function daysAgo(days: number): string {
  return addDaysToDateString(getTodayDateString(), -days)
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Test Habit',
    icon: 'sparkles',
    category: 'wellness',
    frequency: { type: 'daily' },
    target: 1,
    reminderEnabled: false,
    active: true,
    createdAt: `${daysAgo(30)}T00:00:00.000Z`,
    ...overrides,
  }
}

function entry(habitId: string, days: number): HabitEntry {
  return { id: `e-${habitId}-${days}`, habitId, date: daysAgo(days), completedAt: `${daysAgo(days)}T09:00:00.000Z` }
}

describe('isHabitScheduledOn', () => {
  it('is always scheduled for daily habits', () => {
    expect(isHabitScheduledOn({ type: 'daily' }, '2024-06-03')).toBe(true)
    expect(isHabitScheduledOn({ type: 'daily' }, '2024-06-09')).toBe(true)
  })

  it('is always "scheduled" for weekly-target habits (judged over the week, not a fixed day)', () => {
    expect(isHabitScheduledOn({ type: 'weekly', timesPerWeek: 3 }, '2024-06-03')).toBe(true)
  })

  it('matches only the specified weekdays', () => {
    // 2024-06-03 is a Monday.
    const schedule = { type: 'weekdays' as const, days: [1, 3, 5] }
    expect(isHabitScheduledOn(schedule, '2024-06-03')).toBe(true) // Monday
    expect(isHabitScheduledOn(schedule, '2024-06-04')).toBe(false) // Tuesday
    expect(isHabitScheduledOn(schedule, '2024-06-05')).toBe(true) // Wednesday
  })
})

describe('getHabitStatusForDate', () => {
  it('returns inactive when the habit is turned off, regardless of schedule or completion', () => {
    const habit = makeHabit({ active: false })
    expect(getHabitStatusForDate(habit, [], daysAgo(0))).toBe('inactive')
  })

  it('returns unscheduled for a day outside the habit schedule', () => {
    const habit = makeHabit({ frequency: { type: 'weekdays', days: [1, 3, 5] } })
    // Find a date that's a Tuesday relative to "today" is unreliable across days, so test both matched and unmatched schedule values directly.
    expect(getHabitStatusForDate(habit, [], '2024-06-04')).toBe('unscheduled') // Tuesday
  })

  it('returns pending when scheduled but not completed', () => {
    const habit = makeHabit()
    expect(getHabitStatusForDate(habit, [], daysAgo(0))).toBe('pending')
  })

  it('returns completed when an entry exists for that date', () => {
    const habit = makeHabit()
    expect(getHabitStatusForDate(habit, [entry(habit.id, 0)], daysAgo(0))).toBe('completed')
  })
})

describe('getCurrentStreak', () => {
  it('counts consecutive completed days for a daily habit', () => {
    const habit = makeHabit()
    const entries = [entry(habit.id, 0), entry(habit.id, 1), entry(habit.id, 2)]
    expect(getCurrentStreak(habit, entries)).toBe(3)
  })

  it('does not break the streak on an incomplete today — it just isn’t counted yet', () => {
    const habit = makeHabit()
    const entries = [entry(habit.id, 1), entry(habit.id, 2)]
    expect(getCurrentStreak(habit, entries)).toBe(2)
  })

  it('breaks the streak at the first incomplete scheduled day before today', () => {
    const habit = makeHabit()
    const entries = [entry(habit.id, 0), entry(habit.id, 1), entry(habit.id, 3)] // gap at day 2
    expect(getCurrentStreak(habit, entries)).toBe(2)
  })

  it('returns 0 for an empty history', () => {
    expect(getCurrentStreak(makeHabit(), [])).toBe(0)
  })

  it('bridges a weekday-scheduled streak across unscheduled days (Mon/Wed/Fri)', () => {
    // Fixed historical dates, since "today" is unpredictable in CI:
    // 2024-06-03 Mon, 06-04 Tue (unscheduled), 06-05 Wed, 06-06 Thu (unscheduled), 06-07 Fri.
    const mwf = { type: 'weekdays' as const, days: [1, 3, 5] }
    const fixedHabit = makeHabit({ frequency: mwf, createdAt: '2024-05-01T00:00:00.000Z' })
    const fixedEntries: HabitEntry[] = [
      { id: 'a', habitId: fixedHabit.id, date: '2024-06-03', completedAt: '2024-06-03T09:00:00.000Z' },
      { id: 'b', habitId: fixedHabit.id, date: '2024-06-05', completedAt: '2024-06-05T09:00:00.000Z' },
      { id: 'c', habitId: fixedHabit.id, date: '2024-06-07', completedAt: '2024-06-07T09:00:00.000Z' },
    ]
    expect(getCurrentStreak(fixedHabit, fixedEntries, new Date('2024-06-07T12:00:00.000Z'))).toBe(3)
  })

  it('computes a current streak of consecutive weeks meeting a weekly target', () => {
    const habit = makeHabit({ frequency: { type: 'weekly', timesPerWeek: 2 }, createdAt: `${daysAgo(60)}T00:00:00.000Z` })
    // This week: 2 completions (meets target). Last week: 2 completions. Week before: 1 (misses).
    const entries: HabitEntry[] = [
      entry(habit.id, 0),
      entry(habit.id, 1),
      entry(habit.id, 8),
      entry(habit.id, 9),
      entry(habit.id, 15),
    ]
    expect(getCurrentStreak(habit, entries)).toBeGreaterThanOrEqual(1)
  })
})

describe('getBestStreak', () => {
  it('finds the longest run even if it is not the current one', () => {
    const habit = makeHabit()
    const entries = [
      entry(habit.id, 20),
      entry(habit.id, 19),
      entry(habit.id, 18),
      entry(habit.id, 17),
      entry(habit.id, 0),
    ]
    expect(getBestStreak(habit, entries)).toBe(4)
  })

  it('returns 0 for a habit with no completions', () => {
    expect(getBestStreak(makeHabit(), [])).toBe(0)
  })
})

describe('getCompletionRate', () => {
  it('returns 0 for a habit with no entries', () => {
    expect(getCompletionRate(makeHabit(), [], '7D')).toBe(0)
  })

  it('only counts scheduled days as the denominator', () => {
    const habit = makeHabit({ frequency: { type: 'weekdays', days: [1, 3, 5] }, createdAt: `${daysAgo(30)}T00:00:00.000Z` })
    const rate = getCompletionRate(habit, [], '7D')
    expect(rate).toBe(0)
    expect(Number.isFinite(rate)).toBe(true)
  })

  it('never exceeds 100', () => {
    const habit = makeHabit()
    const entries = Array.from({ length: 10 }, (_, i) => entry(habit.id, i))
    expect(getCompletionRate(habit, entries, '7D')).toBeLessThanOrEqual(100)
  })
})

describe('getHabitStats', () => {
  it('bundles streaks and completion rate without NaN/Infinity for empty data', () => {
    const stats = getHabitStats(makeHabit(), [])
    expect(stats.currentStreak).toBe(0)
    expect(stats.bestStreak).toBe(0)
    expect(Number.isFinite(stats.completionRate)).toBe(true)
    expect(stats.completedCount).toBe(0)
  })
})

describe('getWeeklyStrip', () => {
  it('returns 7 days with a status for each', () => {
    const habit = makeHabit()
    const strip = getWeeklyStrip(habit, [])
    expect(strip).toHaveLength(7)
    expect(strip.every((day) => ['completed', 'pending', 'unscheduled', 'inactive'].includes(day.status))).toBe(true)
  })

  it('marks unscheduled days distinctly from pending ones', () => {
    const habit = makeHabit({ frequency: { type: 'weekdays', days: [1, 3, 5] } })
    const strip = getWeeklyStrip(habit, [])
    const scheduledCount = strip.filter((day) => day.status === 'pending').length
    const unscheduledCount = strip.filter((day) => day.status === 'unscheduled').length
    expect(scheduledCount).toBe(3)
    expect(unscheduledCount).toBe(4)
  })
})

describe('getTodaysHabitsSummary', () => {
  it('counts only active, scheduled-today habits toward the total', () => {
    const daily = makeHabit({ id: 'a', frequency: { type: 'daily' } })
    const inactive = makeHabit({ id: 'b', active: false })
    const summary = getTodaysHabitsSummary([daily, inactive], [entry('a', 0)])
    expect(summary.scheduled).toBe(1)
    expect(summary.completed).toBe(1)
    expect(summary.percent).toBe(100)
  })

  it('returns 0% with no crash when nothing is scheduled today', () => {
    const habit = makeHabit({ frequency: { type: 'weekdays', days: [] } })
    const summary = getTodaysHabitsSummary([habit], [])
    expect(summary.scheduled).toBe(0)
    expect(summary.percent).toBe(0)
    expect(Number.isFinite(summary.percent)).toBe(true)
  })
})

describe('water tracking', () => {
  const logs: WaterLog[] = [
    { id: 'w1', date: '2024-06-01', amountMl: 250, createdAt: '2024-06-01T07:00:00.000Z' },
    { id: 'w2', date: '2024-06-01', amountMl: 500, createdAt: '2024-06-01T12:00:00.000Z' },
    { id: 'w3', date: '2024-06-02', amountMl: 250, createdAt: '2024-06-02T07:00:00.000Z' },
  ]

  it('sums logs for a given date', () => {
    expect(getDailyWaterMl(logs, '2024-06-01')).toBe(750)
    expect(getDailyWaterMl(logs, '2024-06-02')).toBe(250)
  })

  it('returns 0 for a date with no logs, never negative', () => {
    expect(getDailyWaterMl(logs, '2024-06-05')).toBe(0)
    expect(getDailyWaterMl([], '2024-06-05')).toBe(0)
  })

  it('computes goal percent, clamped 0-100, with a zero goal reading as 0 not NaN', () => {
    expect(getWaterGoalPercent(750, 2500)).toBe(30)
    expect(getWaterGoalPercent(3000, 2500)).toBe(100)
    const zeroGoal = getWaterGoalPercent(500, 0)
    expect(zeroGoal).toBe(0)
    expect(Number.isFinite(zeroGoal)).toBe(true)
  })

  it('computes remaining water, never negative', () => {
    expect(getRemainingWaterMl(750, 2500)).toBe(1750)
    expect(getRemainingWaterMl(3000, 2500)).toBe(0)
  })

  it('finds the most recently created log for "undo latest"', () => {
    expect(getLatestWaterLogForDate(logs, '2024-06-01')?.id).toBe('w2')
    expect(getLatestWaterLogForDate(logs, '2024-06-09')).toBeNull()
  })

  it('builds a history grouped by date across a range', () => {
    const history = getWaterHistory(logs, 'ALL')
    expect(history).toEqual([
      { date: '2024-06-01', amountMl: 750 },
      { date: '2024-06-02', amountMl: 250 },
    ])
  })

  it('returns an empty history for no logs', () => {
    expect(getWaterHistory([], '30D')).toEqual([])
  })
})
