import { describe, expect, it } from 'vitest'
import type { FoodEntry } from '@/types/nutrition'
import {
  getCaloriesOverTarget,
  getDailyNutrition,
  getDailyTotals,
  getEntriesForDate,
  getEntriesForMeal,
  getNutritionHistory,
  getRemainingCalories,
  getTargetPercent,
  goalToMacroTargets,
  isOverTarget,
  sumMacros,
} from './nutrition'

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: overrides.id ?? `entry-${Math.random()}`,
    foodId: 'food-eggs',
    foodName: 'Eggs',
    meal: 'breakfast',
    quantity: 1,
    servingUnit: 'large eggs',
    calories: 140,
    protein: 12,
    carbohydrates: 1,
    fat: 10,
    fiber: 0,
    date: isoDaysAgo(0),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('getEntriesForDate / getEntriesForMeal', () => {
  it('filters entries by exact date', () => {
    const entries = [makeEntry({ date: '2024-01-01' }), makeEntry({ date: '2024-01-02' })]
    expect(getEntriesForDate(entries, '2024-01-01')).toHaveLength(1)
  })

  it('filters entries by meal', () => {
    const entries = [makeEntry({ meal: 'breakfast' }), makeEntry({ meal: 'lunch' })]
    expect(getEntriesForMeal(entries, 'lunch')).toHaveLength(1)
  })
})

describe('sumMacros', () => {
  it('sums calories and macros across entries', () => {
    const entries = [
      makeEntry({ calories: 100, protein: 10, carbohydrates: 5, fat: 2, fiber: 1 }),
      makeEntry({ calories: 200, protein: 20, carbohydrates: 10, fat: 4, fiber: 2 }),
    ]
    expect(sumMacros(entries)).toEqual({ calories: 300, protein: 30, carbohydrates: 15, fat: 6, fiber: 3 })
  })

  it('returns all-zero totals for an empty list, never NaN', () => {
    const totals = sumMacros([])
    expect(totals).toEqual({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 })
    expect(Number.isFinite(totals.calories)).toBe(true)
  })
})

describe('getDailyTotals', () => {
  it('only totals entries for the given date', () => {
    const entries = [
      makeEntry({ date: '2024-01-01', calories: 100 }),
      makeEntry({ date: '2024-01-02', calories: 500 }),
    ]
    expect(getDailyTotals(entries, '2024-01-01').calories).toBe(100)
  })
})

describe('getDailyNutrition', () => {
  it('groups entries by meal for a single day', () => {
    const entries = [
      makeEntry({ date: '2024-01-01', meal: 'breakfast', calories: 100 }),
      makeEntry({ date: '2024-01-01', meal: 'lunch', calories: 200 }),
      makeEntry({ date: '2024-01-02', meal: 'dinner', calories: 999 }),
    ]
    const daily = getDailyNutrition(entries, '2024-01-01')

    expect(daily.entriesByMeal.breakfast).toHaveLength(1)
    expect(daily.entriesByMeal.lunch).toHaveLength(1)
    expect(daily.entriesByMeal.dinner).toHaveLength(0)
    expect(daily.entriesByMeal.snacks).toHaveLength(0)
    expect(daily.totals.calories).toBe(300)
  })

  it('returns empty meal buckets and zero totals for a day with no entries', () => {
    const daily = getDailyNutrition([], '2024-01-01')
    expect(daily.totals.calories).toBe(0)
    expect(daily.entriesByMeal.breakfast).toEqual([])
  })
})

describe('remaining / over-target calories', () => {
  it('computes remaining calories under target', () => {
    expect(getRemainingCalories(1850, 2200)).toBe(350)
  })

  it('never returns negative remaining calories when over target', () => {
    expect(getRemainingCalories(2500, 2200)).toBe(0)
  })

  it('computes calories over target', () => {
    expect(getCaloriesOverTarget(2500, 2200)).toBe(300)
  })

  it('returns zero over-target when under or at target', () => {
    expect(getCaloriesOverTarget(2000, 2200)).toBe(0)
    expect(getCaloriesOverTarget(2200, 2200)).toBe(0)
  })

  it('flags over-target correctly', () => {
    expect(isOverTarget(2500, 2200)).toBe(true)
    expect(isOverTarget(2000, 2200)).toBe(false)
  })

  it('a zero calorie target is never treated as "over"', () => {
    expect(isOverTarget(100, 0)).toBe(false)
  })
})

describe('getTargetPercent', () => {
  it('computes a percentage of target', () => {
    expect(getTargetPercent(132, 160)).toBe(82.5)
  })

  it('clamps at 100 when over target', () => {
    expect(getTargetPercent(300, 200)).toBe(100)
  })

  it('returns 0 for a zero target instead of NaN or Infinity', () => {
    const percent = getTargetPercent(50, 0)
    expect(percent).toBe(0)
    expect(Number.isFinite(percent)).toBe(true)
  })

  it('returns 0 for zero consumed', () => {
    expect(getTargetPercent(0, 200)).toBe(0)
  })
})

describe('goalToMacroTargets', () => {
  it('maps goal field names to macro target field names', () => {
    const targets = goalToMacroTargets({
      dailyCalories: 2200,
      proteinGrams: 160,
      carbohydrateGrams: 220,
      fatGrams: 70,
      fiberGrams: 30,
    })
    expect(targets).toEqual({ calories: 2200, protein: 160, carbohydrates: 220, fat: 70, fiber: 30 })
  })

  it('leaves fiber undefined when the goal omits it', () => {
    const targets = goalToMacroTargets({
      dailyCalories: 2200,
      proteinGrams: 160,
      carbohydrateGrams: 220,
      fatGrams: 70,
    })
    expect(targets.fiber).toBeUndefined()
  })
})

describe('getNutritionHistory', () => {
  it('groups multiple entries per day and sorts ascending', () => {
    const entries = [
      makeEntry({ date: isoDaysAgo(2), calories: 100 }),
      makeEntry({ date: isoDaysAgo(2), calories: 200 }),
      makeEntry({ date: isoDaysAgo(0), calories: 300 }),
    ]
    const history = getNutritionHistory(entries, 'ALL')

    expect(history).toHaveLength(2)
    expect(history[0]?.date).toBe(isoDaysAgo(2))
    expect(history[0]?.calories).toBe(300)
    expect(history[1]?.calories).toBe(300)
  })

  it('returns an empty array for no entries, without crashing', () => {
    expect(getNutritionHistory([], '30D')).toEqual([])
  })

  it('handles a single data point', () => {
    const history = getNutritionHistory([makeEntry({ date: isoDaysAgo(1) })], 'ALL')
    expect(history).toHaveLength(1)
  })

  it('excludes entries outside the selected range', () => {
    const entries = [makeEntry({ date: isoDaysAgo(100) }), makeEntry({ date: isoDaysAgo(1) })]
    const history = getNutritionHistory(entries, '7D')
    expect(history).toHaveLength(1)
  })

  it('handles sparse/missing days without filling gaps', () => {
    const entries = [makeEntry({ date: isoDaysAgo(10) }), makeEntry({ date: isoDaysAgo(0) })]
    const history = getNutritionHistory(entries, 'ALL')
    expect(history).toHaveLength(2)
  })
})
