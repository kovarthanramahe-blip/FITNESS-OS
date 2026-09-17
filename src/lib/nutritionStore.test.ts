import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapFoodEntryRow } from '@/lib/repositories/cloud/mappers'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addFoodEntry,
  clearDailyEntries,
  deleteFoodEntry,
  editFoodEntry,
  getDailyTotalsFromStore,
  getEntriesForDateFromStore,
  getNutritionGoals,
  getNutritionState,
  mergeNutritionFromCloud,
  purgeLegacyServerIdFoodEntries,
  resetNutritionStoreForTests,
  setNutritionGoals,
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
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetNutritionStoreForTests()
  })

  it('starts a new authenticated user with no food entries', () => {
    setCurrentUserId('user-1')
    resetNutritionStoreForTests()

    expect(getNutritionState().entries).toEqual([])
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

    const { localOnlyEntries } = mergeNutritionFromCloud({ entries: [cloudEntry], goal: null })

    expect(localOnlyEntries.map((e) => e.id)).toEqual([localOnlyId])
    expect(getNutritionState().entries.map((e) => e.id).sort()).toEqual([localOnlyId, 'cloud-1'].sort())
  })

  it('cloud wins on a shared id — never a duplicate entry', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const sharedId = getNutritionState().entries[0]!.id
    const cloudVersion = { ...SAMPLE_ENTRY, id: sharedId, calories: 999, createdAt: '2024-06-01T00:00:00.000Z' }

    mergeNutritionFromCloud({ entries: [cloudVersion], goal: null })

    const entries = getNutritionState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]?.calories).toBe(999)
  })

  it('a null cloud goal keeps the local goal and reports it for push-back', () => {
    const { goalToPush } = mergeNutritionFromCloud({ entries: [], goal: null })
    expect(goalToPush).toEqual(getNutritionState().goal)
  })

  it('a present cloud goal replaces the local goal', () => {
    const cloudGoal = { dailyCalories: 2500, proteinGrams: 180, carbohydrateGrams: 250, fatGrams: 80 }
    mergeNutritionFromCloud({ entries: [], goal: cloudGoal })
    expect(getNutritionState().goal).toEqual(cloudGoal)
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

    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null })
    expect(getNutritionState().entries).toHaveLength(1)

    // Close the app and reopen it (repeatedly) — the count must never grow.
    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null })
    mergeNutritionFromCloud({ entries: [cloudEntry], goal: null })

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
    mergeNutritionFromCloud({ entries: [{ ...canonical, id: 'server-generated-uuid' }], goal: null })
    expect(getNutritionState().entries).toHaveLength(2)

    const removed = purgeLegacyServerIdFoodEntries(['server-generated-uuid'])

    expect(removed).toEqual([{ ...canonical, id: 'server-generated-uuid' }])
    expect(getNutritionState().entries).toEqual([canonical])
  })

  // TEST C
  it('running the purge twice makes no further changes the second time', () => {
    addFoodEntry(SAMPLE_ENTRY)
    const canonical = getNutritionState().entries[0]!
    mergeNutritionFromCloud({ entries: [{ ...canonical, id: 'server-generated-uuid' }], goal: null })

    purgeLegacyServerIdFoodEntries(['server-generated-uuid'])
    const secondRun = purgeLegacyServerIdFoodEntries(['server-generated-uuid'])

    expect(secondRun).toEqual([])
    expect(getNutritionState().entries).toEqual([canonical])
  })

  // TEST D
  it('never removes two legitimate entries that merely look alike', () => {
    const entryA = { ...SAMPLE_ENTRY, id: 'food-client-a', createdAt: '2024-06-01T08:00:00.000Z' }
    const entryB = { ...SAMPLE_ENTRY, id: 'food-client-b', createdAt: '2024-06-01T08:00:00.000Z' }
    mergeNutritionFromCloud({ entries: [entryA, entryB], goal: null })

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

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content (simulating an app restart) never grows entries', async () => {
    vi.resetModules()
    const first = await import('./nutritionStore')
    first.resetNutritionStoreForTests()
    first.addFoodEntry(SAMPLE_ENTRY)
    const afterFirstOpen = first.getNutritionState().entries.length

    vi.resetModules()
    const second = await import('./nutritionStore')
    expect(second.getNutritionState().entries).toHaveLength(afterFirstOpen)

    vi.resetModules()
    const third = await import('./nutritionStore')
    expect(third.getNutritionState().entries).toHaveLength(afterFirstOpen)
  })
})
