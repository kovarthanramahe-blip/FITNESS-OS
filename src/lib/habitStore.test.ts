import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addHabit,
  addWaterLog,
  completeHabit,
  deleteHabit,
  editHabit,
  getHabitHistory,
  getHabitState,
  getHabitsForDate,
  removeLatestWaterLog,
  resetHabitStoreForTests,
  setWaterGoal,
  toggleHabitActive,
  uncompleteHabit,
} from './habitStore'
import { getTodayDateString } from '@/utils/dateRange'
import { getDailyWaterMl } from '@/utils/habits'

const SAMPLE_HABIT = {
  name: 'Read 10 pages',
  icon: 'sparkles' as const,
  category: 'wellness' as const,
  frequency: { type: 'daily' as const },
  target: 1,
  reminderEnabled: false,
  active: true,
}

beforeEach(() => {
  resetHabitStoreForTests()
})

describe('habit CRUD', () => {
  it('adds a new habit', () => {
    const before = getHabitState().habits.length
    addHabit(SAMPLE_HABIT)

    const state = getHabitState()
    expect(state.habits).toHaveLength(before + 1)
    expect(state.habits.at(-1)).toMatchObject({ name: 'Read 10 pages' })
  })

  it('edits a habit without touching its completion history', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    editHabit(added.id, { name: 'Read 20 pages' })

    const updated = getHabitState().habits.find((h) => h.id === added.id)
    expect(updated?.name).toBe('Read 20 pages')
    expect(getHabitHistory(added.id)).toHaveLength(1)
  })

  it('deletes a habit and its entries', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    deleteHabit(added.id)

    expect(getHabitState().habits.some((h) => h.id === added.id)).toBe(false)
    expect(getHabitHistory(added.id)).toHaveLength(0)
  })

  it('toggles active state', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    expect(added.active).toBe(true)

    toggleHabitActive(added.id)
    expect(getHabitState().habits.find((h) => h.id === added.id)?.active).toBe(false)

    toggleHabitActive(added.id)
    expect(getHabitState().habits.find((h) => h.id === added.id)?.active).toBe(true)
  })

  it('supports a weekday schedule', () => {
    addHabit({ ...SAMPLE_HABIT, frequency: { type: 'weekdays', days: [1, 3, 5] } })
    const added = getHabitState().habits.at(-1)!
    expect(added.frequency).toEqual({ type: 'weekdays', days: [1, 3, 5] })
  })

  it('supports a weekly target schedule', () => {
    addHabit({ ...SAMPLE_HABIT, frequency: { type: 'weekly', timesPerWeek: 3 } })
    const added = getHabitState().habits.at(-1)!
    expect(added.frequency).toEqual({ type: 'weekly', timesPerWeek: 3 })
  })

  it('filters habits for a date to those active as of that date', () => {
    addHabit(SAMPLE_HABIT)
    const forToday = getHabitsForDate(getTodayDateString())
    expect(forToday.some((h) => h.name === 'Read 10 pages')).toBe(true)
  })
})

describe('habit completion', () => {
  it('marks a habit complete for a specific date', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!

    completeHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(1)
    expect(getHabitHistory(added.id)[0]?.date).toBe('2024-06-01')
  })

  it('does not create a duplicate entry for the same date', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!

    completeHabit(added.id, '2024-06-01')
    completeHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(1)
  })

  it('undoes a completion', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    uncompleteHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(0)
  })

  it('completion is date-specific, not global', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    uncompleteHabit(added.id, '2024-06-02')

    expect(getHabitHistory(added.id)).toHaveLength(1)
  })
})

describe('water tracking', () => {
  it('adds a water log for a date', () => {
    addWaterLog(250, '2024-06-01')
    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')).toBeGreaterThanOrEqual(250)
  })

  it('removes the latest water log for a date', () => {
    resetHabitStoreForTests()
    const before = getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')
    addWaterLog(250, '2024-06-01')
    addWaterLog(500, '2024-06-01')

    removeLatestWaterLog('2024-06-01')

    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')).toBe(before + 250)
  })

  it('does nothing when removing from a date with no logs', () => {
    const countBefore = getHabitState().waterLogs.length
    removeLatestWaterLog('2099-01-01')
    expect(getHabitState().waterLogs).toHaveLength(countBefore)
  })

  it('updates the water goal', () => {
    setWaterGoal({ goalMl: 3000 })
    expect(getHabitState().waterGoal.goalMl).toBe(3000)
  })

  it('supports multiple dates independently', () => {
    addWaterLog(300, '2024-07-01')
    addWaterLog(400, '2024-07-02')

    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-07-01')).toBe(300)
    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-07-02')).toBe(400)
  })
})

describe('persistence', () => {
  it('persists habits, entries, and water state to localStorage', () => {
    addHabit(SAMPLE_HABIT)
    addWaterLog(250, '2024-06-01')

    const raw = window.localStorage.getItem('fitness-os:habit-store:v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.habits.some((h: { name: string }) => h.name === 'Read 10 pages')).toBe(true)
    expect(parsed.waterLogs.some((w: { amountMl: number }) => w.amountMl === 250)).toBe(true)
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetHabitStoreForTests()
  })

  it('starts a new authenticated user with no habits, entries, or water logs', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()

    const state = getHabitState()
    expect(state.habits).toEqual([])
    expect(state.entries).toEqual([])
    expect(state.waterLogs).toEqual([])
  })

  it('keeps guest/demo mode seeded with mock data', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()
    setCurrentUserId(null)
    resetHabitStoreForTests()

    const state = getHabitState()
    expect(state.habits.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()
    addHabit(SAMPLE_HABIT)
    expect(getHabitState().habits).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getHabitState().habits).toEqual([])
  })
})
