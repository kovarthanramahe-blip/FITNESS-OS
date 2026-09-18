import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMetOption } from '@/data/activityCatalogue'
import { resetStorageScopeForTests, scopedStorageKey, setCurrentUserId } from '@/lib/storageScope'
import { estimateCaloriesBurned, FALLBACK_BODY_WEIGHT_KG, getStepsForDate } from '@/utils/activity'
import {
  deleteActivity,
  getActivityState,
  logActivity,
  resetActivityStoreForTests,
  setStepsForDate,
} from './activityStore'

// A clean, un-seeded slate for every test in this file — the default
// (unauthenticated) store carries demo activity entries and steps for
// recent relative dates, which would otherwise pollute exact-count and
// exact-index assertions below. The "authenticated zero-state" describe
// further below exercises the guest-vs-authenticated seeding itself.
beforeEach(() => {
  setCurrentUserId('user-activity-store-test')
  resetActivityStoreForTests()
})

afterEach(() => {
  resetStorageScopeForTests()
})

describe('logActivity', () => {
  it('appends an entry with the given date, type, and duration', () => {
    const before = getActivityState().entries.length
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 30, date: '2024-06-01' })

    const state = getActivityState()
    expect(state.entries).toHaveLength(before + 1)
    const added = state.entries.at(-1)!
    expect(added).toMatchObject({ activityType: 'running', intensity: 'moderate', durationMinutes: 30, date: '2024-06-01' })
  })

  it('derives intensity from the resolved MET option, never from a separate caller-supplied value', () => {
    logActivity({ activityType: 'walking', metOptionId: 'walking-vigorous', durationMinutes: 20, date: '2024-06-01' })
    expect(getActivityState().entries.at(-1)!.intensity).toBe('vigorous')
  })

  it('estimates calories using the exact MET formula and the supplied body weight', () => {
    const option = getMetOption('running-moderate')!
    logActivity({
      activityType: 'running',
      metOptionId: 'running-moderate',
      durationMinutes: 30,
      date: '2024-06-01',
      currentWeightKg: 80,
    })
    const added = getActivityState().entries.at(-1)!
    expect(added.estimatedCalories).toBe(estimateCaloriesBurned(option.met, 80, 30))
  })

  it('falls back to the documented body weight estimate when no weight is known', () => {
    const option = getMetOption('running-moderate')!
    logActivity({
      activityType: 'running',
      metOptionId: 'running-moderate',
      durationMinutes: 30,
      date: '2024-06-01',
      currentWeightKg: null,
    })
    const added = getActivityState().entries.at(-1)!
    expect(added.estimatedCalories).toBe(estimateCaloriesBurned(option.met, FALLBACK_BODY_WEIGHT_KG, 30))
  })

  it('gives every logged entry a stable, unique client-generated id', () => {
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 10, date: '2024-06-01' })
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 10, date: '2024-06-01' })
    const ids = getActivityState().entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defaults to today when no date is given', () => {
    logActivity({ activityType: 'walking', metOptionId: 'walking-light', durationMinutes: 15 })
    expect(getActivityState().entries.at(-1)!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('never aggregates a new entry into an existing one for the same date — each log is its own record', () => {
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    expect(getActivityState().entries.filter((e) => e.date === '2024-06-01')).toHaveLength(2)
  })
})

describe('deleteActivity', () => {
  it('removes exactly the targeted entry', () => {
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    logActivity({ activityType: 'walking', metOptionId: 'walking-light', durationMinutes: 20, date: '2024-06-02' })
    const [first, second] = getActivityState().entries

    deleteActivity(first!.id)

    const remaining = getActivityState().entries
    expect(remaining.map((e) => e.id)).toEqual([second!.id])
  })

  it('does nothing when the id does not exist', () => {
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    const before = getActivityState().entries
    deleteActivity('not-a-real-id')
    expect(getActivityState().entries).toEqual(before)
  })
})

describe('setStepsForDate', () => {
  it('creates a new record for a date with no existing steps', () => {
    setStepsForDate(8000, '2024-06-01')
    expect(getStepsForDate(getActivityState().dailySteps, '2024-06-01')).toBe(8000)
  })

  it('upserts — replacing the existing total rather than adding a second record for the same date', () => {
    setStepsForDate(8000, '2024-06-01')
    setStepsForDate(9500, '2024-06-01')

    const forDate = getActivityState().dailySteps.filter((s) => s.date === '2024-06-01')
    expect(forDate).toHaveLength(1)
    expect(forDate[0]!.steps).toBe(9500)
  })

  it('never mutates another date when updating one', () => {
    setStepsForDate(8000, '2024-06-01')
    setStepsForDate(5000, '2024-06-02')

    setStepsForDate(9000, '2024-06-01')

    expect(getStepsForDate(getActivityState().dailySteps, '2024-06-01')).toBe(9000)
    expect(getStepsForDate(getActivityState().dailySteps, '2024-06-02')).toBe(5000)
  })

  it('defaults to a manual source, reserving health-connect for future sync', () => {
    setStepsForDate(8000, '2024-06-01')
    expect(getActivityState().dailySteps[0]!.source).toBe('manual')
  })

  it('accepts an explicit source, ready for a future Health Connect import to set it', () => {
    setStepsForDate(8000, '2024-06-01', 'health-connect')
    expect(getActivityState().dailySteps[0]!.source).toBe('health-connect')
  })
})

describe('persistence', () => {
  it('persists entries and daily steps to localStorage', () => {
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    setStepsForDate(8000, '2024-06-01')

    const raw = window.localStorage.getItem(scopedStorageKey('fitness-os:activity-store:v1'))
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.dailySteps).toHaveLength(1)
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetActivityStoreForTests()
  })

  it('starts a new authenticated user with no activity entries or steps', () => {
    setCurrentUserId('user-1')
    resetActivityStoreForTests()

    const state = getActivityState()
    expect(state.entries).toEqual([])
    expect(state.dailySteps).toEqual([])
  })

  it('keeps guest/demo mode seeded with mock data', () => {
    setCurrentUserId('user-1')
    resetActivityStoreForTests()
    setCurrentUserId(null)
    resetActivityStoreForTests()

    expect(getActivityState().entries.length).toBeGreaterThan(0)
    expect(getActivityState().dailySteps.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetActivityStoreForTests()
    logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    expect(getActivityState().entries).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getActivityState().entries).toEqual([])
  })
})

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content never grows entries or steps', async () => {
    vi.resetModules()
    const first = await import('./activityStore')
    first.resetActivityStoreForTests()
    first.logActivity({ activityType: 'running', metOptionId: 'running-moderate', durationMinutes: 20, date: '2024-06-01' })
    first.setStepsForDate(8000, '2024-06-01')
    const afterFirstOpen = {
      entries: first.getActivityState().entries.length,
      dailySteps: first.getActivityState().dailySteps.length,
    }

    vi.resetModules()
    const second = await import('./activityStore')
    expect(second.getActivityState().entries).toHaveLength(afterFirstOpen.entries)
    expect(second.getActivityState().dailySteps).toHaveLength(afterFirstOpen.dailySteps)

    vi.resetModules()
    const third = await import('./activityStore')
    expect(third.getActivityState().entries).toHaveLength(afterFirstOpen.entries)
    expect(third.getActivityState().dailySteps).toHaveLength(afterFirstOpen.dailySteps)
  })
})
