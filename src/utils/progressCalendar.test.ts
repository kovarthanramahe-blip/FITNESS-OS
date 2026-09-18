import { describe, expect, it } from 'vitest'
import type { CalendarDataSources } from './progressCalendar'
import { getCalendarDayActivity, getCalendarMonthGrid } from './progressCalendar'
import type { Habit, HabitEntry } from '@/types/habits'
import type { FoodEntry, WaterLog } from '@/types/nutrition'
import type { WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry } from '@/types/workout'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Drink water',
    icon: 'droplets',
    category: 'hydration',
    frequency: { type: 'daily' },
    target: 1,
    reminderEnabled: false,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeHistoryEntry(date: string, overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
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

function makeFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'entry-1',
    foodId: 'food-1',
    foodName: 'Chicken breast',
    meal: 'lunch',
    quantity: 1,
    servingUnit: 'serving',
    calories: 200,
    protein: 30,
    carbohydrates: 0,
    fat: 5,
    fiber: 0,
    date: '2026-09-16',
    createdAt: '2026-09-16T12:00:00.000Z',
    ...overrides,
  }
}

const EMPTY_SOURCES: CalendarDataSources = {
  workoutHistory: [],
  weightLogs: [],
  foodEntries: [],
  waterLogs: [],
  habits: [],
  habitEntries: [],
}

describe('getCalendarDayActivity — no activity', () => {
  it('reports no activity and hasActivity: false for a day with nothing recorded', () => {
    const activity = getCalendarDayActivity('2026-09-16', EMPTY_SOURCES)

    expect(activity).toEqual({
      date: '2026-09-16',
      workout: false,
      weightKg: null,
      nutrition: null,
      waterMl: null,
      habits: null,
      hasActivity: false,
    })
  })
})

describe('getCalendarDayActivity — workout indicator', () => {
  const history: WorkoutHistoryEntry[] = [makeHistoryEntry('2026-09-16T18:30:00.000Z')]

  it('is true on the completed date and false on adjacent dates', () => {
    expect(getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, workoutHistory: history }).workout).toBe(true)
    expect(getCalendarDayActivity('2026-09-15', { ...EMPTY_SOURCES, workoutHistory: history }).workout).toBe(false)
    expect(getCalendarDayActivity('2026-09-17', { ...EMPTY_SOURCES, workoutHistory: history }).workout).toBe(false)
  })

  it('contributes to hasActivity on its own', () => {
    expect(getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, workoutHistory: history }).hasActivity).toBe(true)
  })
})

describe('getCalendarDayActivity — weight indicator', () => {
  const weightLogs: WeightLog[] = [{ id: 'log-1', date: '2026-09-16', weightKg: 78.4 }]

  it('reports the exact logged weight on the logged date, and null elsewhere', () => {
    expect(getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, weightLogs }).weightKg).toBe(78.4)
    expect(getCalendarDayActivity('2026-09-15', { ...EMPTY_SOURCES, weightLogs }).weightKg).toBeNull()
  })
})

describe('getCalendarDayActivity — nutrition indicator', () => {
  const foodEntries: FoodEntry[] = [
    makeFoodEntry({ id: 'e1', calories: 800, protein: 60, date: '2026-09-16' }),
    makeFoodEntry({ id: 'e2', calories: 1340, protein: 82, date: '2026-09-16' }),
    makeFoodEntry({ id: 'e3', calories: 500, protein: 20, date: '2026-09-15' }),
  ]

  it('sums calories and protein actually logged that day', () => {
    const activity = getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, foodEntries })
    expect(activity.nutrition).toEqual({ calories: 2140, protein: 142 })
  })

  it('is null on a day with no food entries, even when other days have some', () => {
    expect(getCalendarDayActivity('2026-09-17', { ...EMPTY_SOURCES, foodEntries }).nutrition).toBeNull()
  })
})

describe('getCalendarDayActivity — water indicator', () => {
  const waterLogs: WaterLog[] = [
    { id: 'w1', date: '2026-09-16', amountMl: 1800, createdAt: '2026-09-16T08:00:00.000Z' },
    { id: 'w2', date: '2026-09-16', amountMl: 1000, createdAt: '2026-09-16T14:00:00.000Z' },
  ]

  it('totals logged water for the day', () => {
    expect(getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, waterLogs }).waterMl).toBe(2800)
  })

  it('is null when nothing was logged', () => {
    expect(getCalendarDayActivity('2026-09-15', { ...EMPTY_SOURCES, waterLogs }).waterMl).toBeNull()
  })
})

describe('getCalendarDayActivity — habit indicator', () => {
  const habits: Habit[] = [
    makeHabit({ id: 'h1', frequency: { type: 'daily' } }),
    makeHabit({ id: 'h2', frequency: { type: 'daily' } }),
    makeHabit({ id: 'h3', frequency: { type: 'daily' }, active: false }),
  ]
  const habitEntries: HabitEntry[] = [{ id: 'he1', habitId: 'h1', date: '2026-09-16', completedAt: '2026-09-16T09:00:00.000Z' }]

  it('reports completed/scheduled counts, excluding inactive habits from the denominator', () => {
    const activity = getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, habits, habitEntries })
    expect(activity.habits).toEqual({ completed: 1, scheduled: 2 })
  })

  it('is null when no scheduled habit was completed that day', () => {
    expect(getCalendarDayActivity('2026-09-15', { ...EMPTY_SOURCES, habits, habitEntries }).habits).toBeNull()
  })

  it('never counts a habit scheduled on a different weekday', () => {
    const weekdayOnly = [makeHabit({ id: 'h1', frequency: { type: 'weekdays', days: [1, 3, 5] } })] // Mon/Wed/Fri
    const entries: HabitEntry[] = [{ id: 'he1', habitId: 'h1', date: '2026-09-16', completedAt: '2026-09-16T09:00:00.000Z' }] // Wed
    expect(getCalendarDayActivity('2026-09-16', { ...EMPTY_SOURCES, habits: weekdayOnly, habitEntries: entries }).habits).toEqual({
      completed: 1,
      scheduled: 1,
    })
  })
})

describe('getCalendarDayActivity — multiple indicators on one day', () => {
  it('reports every kind of activity that actually occurred that day, together', () => {
    const sources: CalendarDataSources = {
      workoutHistory: [makeHistoryEntry('2026-09-16T18:00:00.000Z')],
      weightLogs: [{ id: 'wl1', date: '2026-09-16', weightKg: 78.4 }],
      foodEntries: [makeFoodEntry({ date: '2026-09-16', calories: 2140, protein: 142 })],
      waterLogs: [{ id: 'wt1', date: '2026-09-16', amountMl: 2800, createdAt: '2026-09-16T08:00:00.000Z' }],
      habits: [makeHabit({ id: 'h1' }), makeHabit({ id: 'h2' })],
      habitEntries: [{ id: 'he1', habitId: 'h1', date: '2026-09-16', completedAt: '2026-09-16T09:00:00.000Z' }],
    }

    const activity = getCalendarDayActivity('2026-09-16', sources)
    expect(activity.workout).toBe(true)
    expect(activity.weightKg).toBe(78.4)
    expect(activity.nutrition).toEqual({ calories: 2140, protein: 142 })
    expect(activity.waterMl).toBe(2800)
    expect(activity.habits).toEqual({ completed: 1, scheduled: 2 })
    expect(activity.hasActivity).toBe(true)
  })
})

describe('getCalendarMonthGrid — month grid positioning', () => {
  it('places September 16, 2026 (Wednesday) in the Wed column', () => {
    const grid = getCalendarMonthGrid(2026, 8) // month is 0-indexed
    const index = grid.findIndex((day) => day.date === '2026-09-16')
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index % 7).toBe(3) // 0=Sun..6=Sat, Wed=3
  })

  it('every row has exactly 7 columns', () => {
    const grid = getCalendarMonthGrid(2026, 8)
    expect(grid.length % 7).toBe(0)
  })

  it('pads September 2026 (starts Tue) with 2 leading days from August', () => {
    const grid = getCalendarMonthGrid(2026, 8)
    const leading = grid.filter((day) => !day.inCurrentMonth && day.date < '2026-09-01')
    expect(leading.map((day) => day.date)).toEqual(['2026-08-30', '2026-08-31'])
  })

  it('marks every day of the month itself as inCurrentMonth', () => {
    const grid = getCalendarMonthGrid(2026, 8)
    const septemberDays = grid.filter((day) => day.date.startsWith('2026-09'))
    expect(septemberDays).toHaveLength(30)
    expect(septemberDays.every((day) => day.inCurrentMonth)).toBe(true)
  })
})

describe('getCalendarMonthGrid — month and year boundaries', () => {
  it('a month with no leading days still forms complete weeks (Nov 2026 starts on Sunday)', () => {
    const grid = getCalendarMonthGrid(2026, 10) // November 2026
    expect(grid[0]?.date).toBe('2026-11-01')
    expect(grid.length % 7).toBe(0)
  })

  it('trails into January when December is the requested month', () => {
    const grid = getCalendarMonthGrid(2026, 11) // December 2026
    const trailing = grid.filter((day) => day.date.startsWith('2027-01'))
    expect(trailing.length).toBeGreaterThan(0)
    expect(trailing.every((day) => !day.inCurrentMonth)).toBe(true)
  })

  it('leads in from December when January is the requested month', () => {
    const grid = getCalendarMonthGrid(2027, 0) // January 2027
    const leading = grid.filter((day) => day.date.startsWith('2026-12'))
    expect(leading.every((day) => !day.inCurrentMonth)).toBe(true)
    expect(grid.some((day) => day.date === '2027-01-01' && day.inCurrentMonth)).toBe(true)
  })

  it('handles a leap-year February (2028) with the correct day count', () => {
    const grid = getCalendarMonthGrid(2028, 1)
    const febDays = grid.filter((day) => day.date.startsWith('2028-02'))
    expect(febDays).toHaveLength(29)
  })
})
