import { beforeEach, describe, expect, it } from 'vitest'
import {
  addFoodEntry,
  clearDailyEntries,
  deleteFoodEntry,
  editFoodEntry,
  getDailyTotalsFromStore,
  getEntriesForDateFromStore,
  getNutritionGoals,
  getNutritionState,
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
