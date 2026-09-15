import { describe, expect, it } from 'vitest'
import { getHabitConsistencyStreak, getStreakSummary, getWaterStreak } from './streaks'
import type { ActivitySnapshot } from './gamification'
import type { Habit, HabitEntry, WaterGoal, WaterLog } from '@/types/habits'

const NOW = new Date('2024-06-10T12:00:00.000Z') // a Monday

function daysAgo(days: number): string {
  const date = new Date(NOW)
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const HABIT_A: Habit = {
  id: 'a',
  name: 'A',
  icon: 'sparkles',
  category: 'wellness',
  frequency: { type: 'daily' },
  target: 1,
  reminderEnabled: false,
  active: true,
  createdAt: `${daysAgo(30)}T00:00:00.000Z`,
}

function entry(habitId: string, date: string): HabitEntry {
  return { id: `${habitId}-${date}`, habitId, date, completedAt: `${date}T09:00:00.000Z` }
}

describe('getHabitConsistencyStreak', () => {
  it('is 0 with no active habits', () => {
    expect(getHabitConsistencyStreak([], [], NOW)).toBe(0)
  })

  it('counts consecutive fully-completed scheduled days', () => {
    const entries = [0, 1, 2].map((d) => entry('a', daysAgo(d)))
    expect(getHabitConsistencyStreak([HABIT_A], entries, NOW)).toBe(3)
  })

  it('does not break the streak on an incomplete today', () => {
    const entries = [1, 2, 3].map((d) => entry('a', daysAgo(d)))
    expect(getHabitConsistencyStreak([HABIT_A], entries, NOW)).toBe(3)
  })

  it('stops at the first fully-missed scheduled day', () => {
    const entries = [0, 1, 3, 4].map((d) => entry('a', daysAgo(d))) // gap at day 2
    expect(getHabitConsistencyStreak([HABIT_A], entries, NOW)).toBe(2)
  })

  it('skips unscheduled days without breaking the streak', () => {
    const weekdaysOnly: Habit = { ...HABIT_A, frequency: { type: 'weekdays', days: [1, 2, 3, 4, 5] } }
    // NOW is a Monday; the prior Friday/Thursday were also scheduled — Saturday/Sunday are not.
    const entries = [0, 3, 4].map((d) => entry('a', daysAgo(d)))
    expect(getHabitConsistencyStreak([weekdaysOnly], entries, NOW)).toBe(3)
  })
})

describe('getWaterStreak', () => {
  const goal: WaterGoal = { goalMl: 2000, preferredUnit: 'l' }

  it('is 0 with no logs', () => {
    expect(getWaterStreak([], goal, NOW)).toBe(0)
  })

  it('counts consecutive goal-met days', () => {
    const logs: WaterLog[] = [0, 1, 2].map((d) => ({ id: `w${d}`, date: daysAgo(d), amountMl: 2500, createdAt: '' }))
    expect(getWaterStreak(logs, goal, NOW)).toBe(3)
  })

  it('forgives an incomplete today', () => {
    const logs: WaterLog[] = [
      { id: 'w0', date: daysAgo(0), amountMl: 500, createdAt: '' },
      { id: 'w1', date: daysAgo(1), amountMl: 2500, createdAt: '' },
    ]
    expect(getWaterStreak(logs, goal, NOW)).toBe(1)
  })
})

describe('getStreakSummary', () => {
  it('returns 3 clearly distinguished streak items', () => {
    const snapshot: ActivitySnapshot = {
      workoutHistory: [],
      personalRecords: [],
      foodEntries: [],
      habits: [],
      habitEntries: [],
      waterLogs: [],
      waterGoal: { goalMl: 2500, preferredUnit: 'l' },
      weightLogs: [],
      measurements: [],
      todayProgramDayType: null,
      now: NOW,
    }
    const summary = getStreakSummary(snapshot)
    expect(summary.map((s) => s.key)).toEqual(['workout', 'water', 'habits'])
    expect(summary.every((s) => s.value === 0)).toBe(true)
  })
})
