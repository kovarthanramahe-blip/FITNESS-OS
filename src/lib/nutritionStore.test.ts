import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapFoodEntryRow, mapWaterLogRow } from '@/lib/repositories/cloud/mappers'
import { resetStorageScopeForTests, scopedStorageKey, setCurrentUserId } from '@/lib/storageScope'
import type { WaterLog } from '@/types/nutrition'
import { getDailyWaterMl } from '@/utils/nutrition'
import {
  addFoodEntry,
  addWaterLog,
  clearDailyEntries,
  deleteFoodEntry,
  editFoodEntry,
  getDailyTotalsFromStore,
  getEntriesForDateFromStore,
  getNutritionGoals,
  getNutritionState,
  mergeNutritionFromCloud,
  purgeLegacyServerIdFoodEntries,
  purgeLegacyServerIdWaterLogs,
  removeLatestWaterLog,
  resetNutritionStoreForTests,
  setNutritionGoals,
  setWaterGoal,
} from './nutritionStore'

const SAMPLE_ENTRY = {
  foodId: 'food-eggs',
  foodName: 'Eggs',
  meal: 'breakfast' as const,
  quantity: 1,
  servingUnit: 'large eggs',
  calories: 140,
  protein: 12,
  carbohydrates: 1,
  fat: 10,
  fiber: 0,
  date: '2024-06-01',
}

beforeEach(() => {
  resetNutritionStoreForTests()
})

describe('food entries', () => {
  it('adds a new food entry', () => {
    const before = getNutritionState().entries.length
    addFoodEntry(SAMPLE_ENTRY)

    const state = getNutritionState()
    expect(state.entries).toHaveLength(before + 1)
    expect(state.entries.at(-1)).toMatchObject({ foodName: 'Eggs', calories: 140 })
  })

  it('edits an existing food entry', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const added = getNutritionState().entries.at(-1)
    expect(added).toBeDefined()

    editFoodEntry(added!.id, { quantity: 2, calories: 280 })

    const updated = getNutritionState().entries.find((entry) => entry.id === added!.id)
    expect(updated?.quantity).toBe(2)
    expect(updated?.calories).toBe(280)
  })

  it('deletes a food entry', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const added = getNutritionState().entries.at(-1)
    const countBefore = getNutritionState().entries.length

    deleteFoodEntry(added!.id)

    expect(getNutritionState().entries).toHaveLength(countBefore - 1)
    expect(getNutritionState().entries.some((entry) => entry.id === added!.id)).toBe(false)
  })

  it('clears all entries for a given date without touching other dates', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: '2024-06-01' })
    addFoodEntry({ ...SAMPLE_ENTRY, date: '2024-06-02' })

    clearDailyEntries('2024-06-01')

    expect(getEntriesForDateFromStore('2024-06-01')).toHaveLength(0)
    expect(getEntriesForDateFromStore('2024-06-02')).toHaveLength(1)
  })

  it('derives daily totals from entries rather than storing them', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: '2024-06-03', calories: 140 })
    addFoodEntry({ ...SAMPLE_ENTRY, date: '2024-06-03', calories: 200 })

    expect(getDailyTotalsFromStore('2024-06-03').calories).toBe(340)
  })
})

describe('nutrition goals', () => {
  it('updates nutrition goals', () => {
    setNutritionGoals({ dailyCalories: 1900, proteinGrams: 140 })

    const goal = getNutritionGoals()
    expect(goal.dailyCalories).toBe(1900)
    expect(goal.proteinGrams).toBe(140)
  })

  it('leaves untouched goal fields as they were', () => {
    const before = getNutritionGoals()
    setNutritionGoals({ dailyCalories: 2000 })

    expect(getNutritionGoals().fatGrams).toBe(before.fatGrams)
  })
})

describe('water tracking', () => {
  it('adds a water log for a date', () => {
    addWaterLog(250, '2024-06-01')
    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-06-01')).toBeGreaterThanOrEqual(250)
  })

  it('supports a custom amount, not just the 250/500 quick-adds', () => {
    addWaterLog(137, '2024-06-01')
    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-06-01')).toBeGreaterThanOrEqual(137)
  })

  it('removes the latest water log for a date', () => {
    resetNutritionStoreForTests()
    const before = getDailyWaterMl(getNutritionState().waterLogs, '2024-06-01')
    addWaterLog(250, '2024-06-01')
    addWaterLog(500, '2024-06-01')

    removeLatestWaterLog('2024-06-01')

    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-06-01')).toBe(before + 250)
  })

  it('does nothing when removing from a date with no logs', () => {
    const countBefore = getNutritionState().waterLogs.length
    removeLatestWaterLog('2099-01-01')
    expect(getNutritionState().waterLogs).toHaveLength(countBefore)
  })

  it('updates the water goal', () => {
    setWaterGoal({ goalMl: 3000 })
    expect(getNutritionState().waterGoal.goalMl).toBe(3000)
  })

  it('reads zero for a date with no water logged at all, never negative or NaN', () => {
    setCurrentUserId('user-zero-water')
    resetNutritionStoreForTests()
    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-06-01')).toBe(0)
    resetStorageScopeForTests()
  })

  it('supports multiple dates independently', () => {
    addWaterLog(300, '2024-07-01')
    addWaterLog(400, '2024-07-02')

    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-07-01')).toBe(300)
    expect(getDailyWaterMl(getNutritionState().waterLogs, '2024-07-02')).toBe(400)
  })
})

describe('persistence', () => {
  it('persists entries and goals to localStorage', () => {
    addFoodEntry(SAMPLE_ENTRY)
    setNutritionGoals({ dailyCalories: 2000 })

    const raw = window.localStorage.getItem('fitness-os:nutrition-store:v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.goal.dailyCalories).toBe(2000)
    expect(parsed.entries.some((entry: { foodName: string }) => entry.foodName === 'Eggs')).toBe(true)
  })

  it('reloads persisted state on next store access after a reset', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const countAfterAdd = getNutritionState().entries.length

    // Simulate a fresh module load by re-reading from localStorage directly.
    const raw = window.localStorage.getItem('fitness-os:nutrition-store:v1')
    const parsed = JSON.parse(raw!)
    expect(parsed.entries).toHaveLength(countAfterAdd)
  })

  it('persists water logs and goal alongside entries', () => {
    addWaterLog(250, '2024-06-01')
    setWaterGoal({ goalMl: 3000 })

    const raw = window.localStorage.getItem('fitness-os:nutrition-store:v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.waterGoal.goalMl).toBe(3000)
    expect(parsed.waterLogs.some((log: { amountMl: number }) => log.amountMl === 250)).toBe(true)
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetNutritionStoreForTests()
  })

  it('starts a new authenticated user with no food entries or water logs', () => {
    setCurrentUserId('user-1')
    resetNutritionStoreForTests()

    const state = getNutritionState()
    expect(state.entries).toEqual([])
    expect(state.waterLogs).toEqual([])
  })

  it('keeps guest/demo mode seeded with mock data', () => {
    setCurrentUserId('user-1')
    resetNutritionStoreForTests()
    setCurrentUserId(null)
    resetNutritionStoreForTests()

    expect(getNutritionState().entries.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetNutritionStoreForTests()
    addFoodEntry(SAMPLE_ENTRY)
    expect(getNutritionState().entries).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getNutritionState().entries).toEqual([])
  })
})

describe('mergeNutritionFromCloud', () => {
  beforeEach(() => {
    setCurrentUserId('user-merge-test')
    resetNutritionStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('unions cloud and local-only entries, keeping both, and returns the local-only ones', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const localOnlyId = getNutritionState().entries[0]!.id
    const cloudEntry = { ...SAMPLE_ENTRY, id: 'cloud-1', createdAt: '2024-06-01T00:00:00.000Z' }

    const { localOnlyEntries } = mergeNutritionFromCloud({ entries: [cloudEntry], goal: null, waterLogs: [], waterGoal: null })

    expect(localOnlyEntries.map((e) => e.id)).toEqual([localOnlyId])
    expect(getNutritionState().entries.map((e) => e.id).sort()).toEqual([localOnlyId, 'cloud-1'].sort())
  })

  it('cloud wins on a shared id — never a duplicate entry', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const sharedId = getNutritionState().entries[0]!.id
    const cloudVersion = { ...SAMPLE_ENTRY, id: sharedId, calories: 999, createdAt: '2024-06-01T00:00:00.000Z' }

    mergeNutritionFromCloud({ entries: [cloudVersion], goal: null, waterLogs: [], waterGoal: null })

    const entries = getNutritionState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]?.calories).toBe(999)
  })

  it('a null cloud goal keeps the local goal and reports it for push-back', () => {
    const { goalToPush } = mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [], waterGoal: null })
    expect(goalToPush).toEqual(getNutritionState().goal)
  })

  it('a present cloud goal replaces the local goal', () => {
    const cloudGoal = { dailyCalories: 2500, proteinGrams: 180, carbohydrateGrams: 250, fatGrams: 80 }
    mergeNutritionFromCloud({ entries: [], goal: cloudGoal, waterLogs: [], waterGoal: null })
    expect(getNutritionState().goal).toEqual(cloudGoal)
  })

  it('cloud wins on a shared water log id — never a duplicate', () => {
    addWaterLog(250, '2024-06-01')
    const sharedId = getNutritionState().waterLogs[0]!.id
    const cloudLog = { id: sharedId, date: '2024-06-01', amountMl: 500, createdAt: '2024-06-01T00:00:00.000Z' }

    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [cloudLog], waterGoal: null })

    expect(getNutritionState().waterLogs).toEqual([cloudLog])
  })

  it('a null cloud water goal keeps the local one and reports it for push-back', () => {
    const { waterGoalToPush } = mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [], waterGoal: null })
    expect(waterGoalToPush).toEqual(getNutritionState().waterGoal)
  })

  it('a present cloud water goal replaces the local one', () => {
    const cloudGoal = { goalMl: 3500, preferredUnit: 'ml' as const }
    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [], waterGoal: cloudGoal })
    expect(getNutritionState().waterGoal).toEqual(cloudGoal)
  })

  // Regression for the double-counting bug: a food entry already pushed to
  // the cloud comes back through the real mapper keyed by `client_entry_id`
  // (the local id), never the server row id — feeding `mapFoodEntryRow`'s
  // actual output in here is what makes this test fail against the old
  // `id: row.id` mapper (duplicates on the very next hydration/app-reopen)
  // and pass against the fix.
  it('hydrating the same already-synced food entry repeatedly (closing/reopening the app) never duplicates it', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const localEntryId = getNutritionState().entries[0]!.id

    const cloudEntry = mapFoodEntryRow({
      id: 'server-generated-uuid',
      user_id: 'user-merge-test',
      client_entry_id: localEntryId,
      food_id: SAMPLE_ENTRY.foodId,
      food_name: SAMPLE_ENTRY.foodName,
      meal: SAMPLE_ENTRY.meal,
      quantity: SAMPLE_ENTRY.quantity,
      serving_unit: SAMPLE_ENTRY.servingUnit,
      calories: SAMPLE_ENTRY.calories,
      protein: SAMPLE_ENTRY.protein,
      carbohydrates: SAMPLE_ENTRY.carbohydrates,
      fat: SAMPLE_ENTRY.fat,
      fiber: SAMPLE_ENTRY.fiber,
      log_date: SAMPLE_ENTRY.date,
      created_at: '2024-06-01T00:00:00.000Z',
    })

    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null, waterLogs: [], waterGoal: null })
    expect(getNutritionState().entries).toHaveLength(1)

    // Close the app and reopen it (repeatedly) — the count must never grow.
    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null, waterLogs: [], waterGoal: null })
    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null, waterLogs: [], waterGoal: null })

    expect(getNutritionState().entries).toHaveLength(1)
    expect(getNutritionState().entries[0]!.id).toBe(localEntryId)
  })
})

describe('purgeLegacyServerIdFoodEntries (one-time local-duplicate cleanup)', () => {
  beforeEach(() => {
    setCurrentUserId('user-purge-test')
    resetNutritionStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  // TEST A
  it('does nothing for a fresh store with no entries at all', () => {
    expect(purgeLegacyServerIdFoodEntries(['server-uuid'])).toEqual([])
    expect(getNutritionState().entries).toEqual([])
  })

  // TEST B
  it('removes a legacy server-id-keyed food entry while keeping the canonical client-id copy', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const canonical = getNutritionState().entries[0]!
    mergeNutritionFromCloud({ entries: [{ ...canonical, id: 'server-generated-uuid' }], goal: null, waterLogs: [], waterGoal: null })
    expect(getNutritionState().entries).toHaveLength(2)

    const removed = purgeLegacyServerIdFoodEntries(['server-generated-uuid'])

    expect(removed).toEqual([{ ...canonical, id: 'server-generated-uuid' }])
    expect(getNutritionState().entries).toEqual([canonical])
  })

  // TEST C
  it('running the purge twice makes no further changes the second time', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const canonical = getNutritionState().entries[0]!
    mergeNutritionFromCloud({ entries: [{ ...canonical, id: 'server-generated-uuid' }], goal: null, waterLogs: [], waterGoal: null })

    purgeLegacyServerIdFoodEntries(['server-generated-uuid'])
    const secondRun = purgeLegacyServerIdFoodEntries(['server-generated-uuid'])

    expect(secondRun).toEqual([])
    expect(getNutritionState().entries).toEqual([canonical])
  })

  // TEST D
  it('never removes two legitimate entries that merely look alike', () => {
    const entryA = { ...SAMPLE_ENTRY, id: 'food-client-a', createdAt: '2024-06-01T08:00:00.000Z' }
    const entryB = { ...SAMPLE_ENTRY, id: 'food-client-b', createdAt: '2024-06-01T08:00:00.000Z' }
    mergeNutritionFromCloud({ entries: [entryA, entryB], goal: null, waterLogs: [], waterGoal: null })

    const removed = purgeLegacyServerIdFoodEntries(['unrelated-server-uuid'])

    expect(removed).toEqual([])
    expect(getNutritionState().entries.map((e) => e.id).sort()).toEqual(['food-client-a', 'food-client-b'])
  })

  // TEST E
  it('never removes a local-only entry whose id was never seen on the server', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const before = getNutritionState().entries

    purgeLegacyServerIdFoodEntries(['a-server-uuid-that-is-not-this-record'])

    expect(getNutritionState().entries).toBe(before)
  })
})

describe('purgeLegacyServerIdWaterLogs (one-time local-duplicate cleanup)', () => {
  beforeEach(() => {
    setCurrentUserId('user-purge-water-test')
    resetNutritionStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('does nothing for a fresh store with no water logs at all', () => {
    expect(purgeLegacyServerIdWaterLogs(['server-uuid'])).toEqual([])
    expect(getNutritionState().waterLogs).toEqual([])
  })

  it('removes a legacy server-id-keyed water log while keeping the canonical client-id copy', () => {
    addWaterLog(250, '2024-06-01')
    const canonical = getNutritionState().waterLogs[0]!
    mergeNutritionFromCloud({
      entries: [],
      goal: null,
      waterLogs: [{ ...canonical, id: 'server-generated-uuid' }],
      waterGoal: null,
    })
    expect(getNutritionState().waterLogs).toHaveLength(2)

    const removed = purgeLegacyServerIdWaterLogs(['server-generated-uuid'])

    expect(removed).toEqual([{ ...canonical, id: 'server-generated-uuid' }])
    expect(getNutritionState().waterLogs).toEqual([canonical])
  })

  it('running the purge twice makes no further changes the second time', () => {
    addWaterLog(250, '2024-06-01')
    const canonical = getNutritionState().waterLogs[0]!
    mergeNutritionFromCloud({
      entries: [],
      goal: null,
      waterLogs: [{ ...canonical, id: 'server-generated-uuid' }],
      waterGoal: null,
    })

    purgeLegacyServerIdWaterLogs(['server-generated-uuid'])
    const secondRun = purgeLegacyServerIdWaterLogs(['server-generated-uuid'])

    expect(secondRun).toEqual([])
    expect(getNutritionState().waterLogs).toEqual([canonical])
  })

  it('never removes a local-only water log whose id was never seen on the server', () => {
    addWaterLog(250, '2024-06-01')
    const before = getNutritionState().waterLogs

    purgeLegacyServerIdWaterLogs(['a-server-uuid-that-is-not-this-record'])

    expect(getNutritionState().waterLogs).toBe(before)
  })
})

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content (simulating an app restart) never grows entries or water logs', async () => {
    vi.resetModules()
    const first = await import('./nutritionStore')
    first.resetNutritionStoreForTests()
    first.addFoodEntry(SAMPLE_ENTRY)
    first.addWaterLog(250, '2024-06-01')
    const afterFirstOpen = {
      entries: first.getNutritionState().entries.length,
      waterLogs: first.getNutritionState().waterLogs.length,
    }

    vi.resetModules()
    const second = await import('./nutritionStore')
    expect(second.getNutritionState().entries).toHaveLength(afterFirstOpen.entries)
    expect(second.getNutritionState().waterLogs).toHaveLength(afterFirstOpen.waterLogs)

    vi.resetModules()
    const third = await import('./nutritionStore')
    expect(third.getNutritionState().entries).toHaveLength(afterFirstOpen.entries)
    expect(third.getNutritionState().waterLogs).toHaveLength(afterFirstOpen.waterLogs)
  })
})

/**
 * Explicit date-isolation regression requested alongside the water bug fix:
 * unlike water (which had a real UI-wiring bug — see Nutrition.test.tsx),
 * nutrition entries already carry their own `date` field end-to-end
 * (FoodEntryModal's `defaultDate`, `getDailyNutrition`/`getEntriesForDate`
 * always filtering by exact date-string match). These tests document and
 * lock in that yesterday's nutrition is never the same as today's.
 */
describe('nutrition date isolation (yesterday != today)', () => {
  const YESTERDAY = '2026-09-17'
  const TODAY = '2026-09-18'

  // A signed-in, un-seeded slate — the default (unauthenticated) store
  // carries demo food entries for recent relative dates, which would
  // otherwise add to these exact-calorie assertions.
  beforeEach(() => {
    setCurrentUserId('user-nutrition-date-regression')
    resetNutritionStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('yesterday and today accumulate independent totals', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: YESTERDAY, calories: 1800 })
    addFoodEntry({ ...SAMPLE_ENTRY, date: TODAY, calories: 2200 })

    expect(getDailyTotalsFromStore(YESTERDAY).calories).toBe(1800)
    expect(getDailyTotalsFromStore(TODAY).calories).toBe(2200)
  })

  it('adding an entry for today does not change yesterday\'s totals', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: YESTERDAY, calories: 1800 })
    addFoodEntry({ ...SAMPLE_ENTRY, date: TODAY, calories: 2200 })

    addFoodEntry({ ...SAMPLE_ENTRY, date: TODAY, calories: 300 })

    expect(getDailyTotalsFromStore(TODAY).calories).toBe(2500)
    expect(getDailyTotalsFromStore(YESTERDAY).calories).toBe(1800)
  })

  it('editing today\'s entry does not change yesterday\'s entries', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: YESTERDAY, calories: 1800 })
    addFoodEntry({ ...SAMPLE_ENTRY, date: TODAY, calories: 2200 })
    const todayEntry = getEntriesForDateFromStore(TODAY)[0]!

    editFoodEntry(todayEntry.id, { calories: 9999 })

    expect(getDailyTotalsFromStore(TODAY).calories).toBe(9999)
    expect(getDailyTotalsFromStore(YESTERDAY).calories).toBe(1800)
  })

  it('deleting today\'s entry does not remove yesterday\'s', () => {
    addFoodEntry({ ...SAMPLE_ENTRY, date: YESTERDAY, calories: 1800 })
    addFoodEntry({ ...SAMPLE_ENTRY, date: TODAY, calories: 2200 })
    const todayEntry = getEntriesForDateFromStore(TODAY)[0]!

    deleteFoodEntry(todayEntry.id)

    expect(getEntriesForDateFromStore(TODAY)).toHaveLength(0)
    expect(getDailyTotalsFromStore(YESTERDAY).calories).toBe(1800)
  })
})

/**
 * Regression suite for the real-device water bug: water still combining
 * across dates on the S24 Ultra. Water now lives in this store, following
 * the exact same append-only, exact-date-string model as food entries
 * above — every date's total is derived fresh by filtering on `date`,
 * never carried over from or mutated by another date's writes, across
 * local persistence, app reload, and cloud sync alike.
 */
describe('water date isolation regression (bug fix)', () => {
  const YESTERDAY = '2026-09-17'
  const TODAY = '2026-09-18'

  // A clean, un-seeded slate — the default (unauthenticated) store carries
  // demo water logs for recent relative dates, which would otherwise add
  // to these exact-ml assertions.
  beforeEach(() => {
    setCurrentUserId('user-water-regression')
    resetNutritionStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
    resetNutritionStoreForTests()
  })

  it('1. yesterday = 3500 ml', () => {
    addWaterLog(3500, YESTERDAY)
    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(3500)
  })

  it('2. today = 4000 ml', () => {
    addWaterLog(4000, TODAY)
    expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4000)
  })

  it('3. adding 500 ml today does not change yesterday: yesterday stays 3500, today becomes 4500', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)

    addWaterLog(500, TODAY)

    expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4500)
    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(3500)
  })

  it('4. adding 500 ml yesterday does not change today: yesterday becomes 4000, today stays 4500', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    addWaterLog(500, TODAY) // today = 4500, matching the scenario chain above

    addWaterLog(500, YESTERDAY)

    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(4000)
    expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4500)
  })

  it('5. app reload (re-reading localStorage) preserves both values independently', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)

    const raw = window.localStorage.getItem(scopedStorageKey('fitness-os:nutrition-store:v1'))
    const parsed = JSON.parse(raw!) as { waterLogs: WaterLog[] }

    expect(getDailyWaterMl(parsed.waterLogs, YESTERDAY)).toBe(3500)
    expect(getDailyWaterMl(parsed.waterLogs, TODAY)).toBe(4000)
  })

  it('6. switching dates repeatedly never cross-contaminates totals', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)

    // Simulate the user bouncing back and forth between Previous day/Today
    // in the UI — reading a date's total must never mutate any date.
    for (let i = 0; i < 5; i++) {
      expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(3500)
      expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4000)
    }
  })

  it('7. zero water for a date with no logs, never inherited from another date', () => {
    addWaterLog(4000, TODAY)
    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(0)
  })

  it('8. cloud push/hydration preserves both values independently', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    const [localYesterdayId, localTodayId] = getNutritionState().waterLogs.map((log) => log.id)

    // Simulate what comes back from Supabase on the next sign-in: the same
    // two logs, round-tripped through the real mapper, keyed by their
    // stable client ids (never the server row id).
    const cloudYesterday = mapWaterLogRow({
      id: 'server-uuid-yesterday',
      user_id: 'user-water-regression',
      client_log_id: localYesterdayId!,
      log_date: YESTERDAY,
      amount_ml: 3500,
      created_at: `${YESTERDAY}T08:00:00.000Z`,
    })
    const cloudToday = mapWaterLogRow({
      id: 'server-uuid-today',
      user_id: 'user-water-regression',
      client_log_id: localTodayId!,
      log_date: TODAY,
      amount_ml: 4000,
      created_at: `${TODAY}T08:00:00.000Z`,
    })

    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [cloudYesterday, cloudToday], waterGoal: null })

    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(3500)
    expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4000)
  })

  it('9. no duplicate water records are created during repeated hydration (app close/reopen)', () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    const [localYesterdayId, localTodayId] = getNutritionState().waterLogs.map((log) => log.id)

    const cloudYesterday = mapWaterLogRow({
      id: 'server-uuid-yesterday',
      user_id: 'user-water-regression',
      client_log_id: localYesterdayId!,
      log_date: YESTERDAY,
      amount_ml: 3500,
      created_at: `${YESTERDAY}T08:00:00.000Z`,
    })
    const cloudToday = mapWaterLogRow({
      id: 'server-uuid-today',
      user_id: 'user-water-regression',
      client_log_id: localTodayId!,
      log_date: TODAY,
      amount_ml: 4000,
      created_at: `${TODAY}T08:00:00.000Z`,
    })

    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [cloudYesterday, cloudToday], waterGoal: null })
    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [cloudYesterday, cloudToday], waterGoal: null })
    mergeNutritionFromCloud({ entries: [], goal: null, waterLogs: [cloudYesterday, cloudToday], waterGoal: null })

    expect(getNutritionState().waterLogs).toHaveLength(2)
    expect(getDailyWaterMl(getNutritionState().waterLogs, YESTERDAY)).toBe(3500)
    expect(getDailyWaterMl(getNutritionState().waterLogs, TODAY)).toBe(4000)
  })
})

/**
 * Migration coverage: water used to be persisted inside habitStore's own
 * localStorage blob (`fitness-os:habit-store:v1`). Moving it into this
 * store must not silently discard an existing user's water history — it's
 * recovered once, on the first load of a scope that has never itself
 * persisted a `waterLogs` key, and never resurfaces once this store has
 * its own (even empty) water state.
 */
describe('water migration from the legacy habit-store key', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetNutritionStoreForTests()
  })

  it('recovers existing water logs and goal from the legacy key on first load', () => {
    setCurrentUserId('user-migration-test')
    resetNutritionStoreForTests()

    const legacyWaterLogs: WaterLog[] = [
      { id: 'legacy-w1', date: '2024-06-01', amountMl: 750, createdAt: '2024-06-01T08:00:00.000Z' },
    ]
    const legacyWaterGoal = { goalMl: 2800, preferredUnit: 'ml' as const }
    window.localStorage.setItem(
      scopedStorageKey('fitness-os:habit-store:v1'),
      JSON.stringify({ habits: [], entries: [], waterLogs: legacyWaterLogs, waterGoal: legacyWaterGoal }),
    )

    // Re-trigger loadPersistedState the same way a real account switch
    // does, landing back on the same scope so the legacy key above is seen.
    setCurrentUserId('user-migration-transition')
    setCurrentUserId('user-migration-test')

    expect(getNutritionState().waterLogs).toEqual(legacyWaterLogs)
    expect(getNutritionState().waterGoal).toEqual(legacyWaterGoal)
  })

  it('never re-migrates once this store has persisted its own water state, even if now empty', () => {
    setCurrentUserId('user-migration-test-2')
    resetNutritionStoreForTests()
    addFoodEntry(SAMPLE_ENTRY) // persists this store's own (empty) waterLogs: []

    const legacyWaterLogs: WaterLog[] = [
      { id: 'legacy-w2', date: '2024-06-01', amountMl: 999, createdAt: '2024-06-01T08:00:00.000Z' },
    ]
    window.localStorage.setItem(
      scopedStorageKey('fitness-os:habit-store:v1'),
      JSON.stringify({ waterLogs: legacyWaterLogs, waterGoal: null }),
    )

    setCurrentUserId('user-migration-transition-2')
    setCurrentUserId('user-migration-test-2')

    expect(getNutritionState().waterLogs).toEqual([])
  })

  it('is a no-op when there is no legacy key at all', () => {
    setCurrentUserId('user-migration-test-3')
    resetNutritionStoreForTests()

    setCurrentUserId('user-migration-transition-3')
    setCurrentUserId('user-migration-test-3')

    expect(getNutritionState().waterLogs).toEqual([])
  })
})
