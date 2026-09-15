import { MEAL_TYPES } from '@/types/nutrition'
import type { DailyNutrition, FoodEntry, MacroTotals, MealType, NutritionGoal, NutritionTimeRange } from '@/types/nutrition'
import { filterByRange } from '@/utils/dateRange'
import { clamp } from '@/utils/format'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }

// ---------------------------------------------------------------------------
// Entry lookups — all daily totals are derived from these, never stored.
// ---------------------------------------------------------------------------

export function getEntriesForDate(entries: FoodEntry[], date: string): FoodEntry[] {
  return entries.filter((entry) => entry.date === date)
}

export function getEntriesForMeal(entries: FoodEntry[], meal: MealType): FoodEntry[] {
  return entries.filter((entry) => entry.meal === meal)
}

export function sumMacros(entries: FoodEntry[]): MacroTotals {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: round1(totals.protein + entry.protein),
      carbohydrates: round1(totals.carbohydrates + entry.carbohydrates),
      fat: round1(totals.fat + entry.fat),
      fiber: round1(totals.fiber + entry.fiber),
    }),
    { ...EMPTY_TOTALS },
  )
}

export function getDailyTotals(entries: FoodEntry[], date: string): MacroTotals {
  return sumMacros(getEntriesForDate(entries, date))
}

/** Full day view: totals plus entries grouped by meal, for rendering meal sections. */
export function getDailyNutrition(entries: FoodEntry[], date: string): DailyNutrition {
  const dayEntries = getEntriesForDate(entries, date)
  const entriesByMeal = Object.fromEntries(
    MEAL_TYPES.map((meal) => [meal, dayEntries.filter((entry) => entry.meal === meal)]),
  ) as Record<MealType, FoodEntry[]>

  return { date, totals: sumMacros(dayEntries), entriesByMeal }
}

// ---------------------------------------------------------------------------
// Calorie / macro progress — direction-neutral: works the same whether the
// goal is maintenance, a deficit, or a surplus.
// ---------------------------------------------------------------------------

export function getRemainingCalories(consumedCalories: number, targetCalories: number): number {
  return Math.max(targetCalories - consumedCalories, 0)
}

export function getCaloriesOverTarget(consumedCalories: number, targetCalories: number): number {
  return Math.max(consumedCalories - targetCalories, 0)
}

export function isOverTarget(consumedCalories: number, targetCalories: number): boolean {
  return targetCalories > 0 && consumedCalories > targetCalories
}

/** 0-100, clamped so a progress bar never renders past full or goes negative. Zero target reads as 0%, never NaN. */
export function getTargetPercent(consumed: number, target: number): number {
  if (target <= 0) return 0
  return round1(clamp((consumed / target) * 100, 0, 100))
}

export function goalToMacroTargets(goal: NutritionGoal): {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber?: number
} {
  return {
    calories: goal.dailyCalories,
    protein: goal.proteinGrams,
    carbohydrates: goal.carbohydrateGrams,
    fat: goal.fatGrams,
    fiber: goal.fiberGrams,
  }
}

// ---------------------------------------------------------------------------
// History — grouped by day within a time range. Only days with logged
// entries appear; sparse/missing days are left out rather than
// interpolated, so a chart never implies data that wasn't logged.
// ---------------------------------------------------------------------------

export interface NutritionHistoryPoint extends MacroTotals {
  date: string
}

export function getNutritionHistory(
  entries: FoodEntry[],
  range: NutritionTimeRange,
  now: Date = new Date(),
): NutritionHistoryPoint[] {
  const inRange = filterByRange(entries, (entry) => entry.date, range, now)
  const byDate = new Map<string, FoodEntry[]>()
  for (const entry of inRange) {
    const list = byDate.get(entry.date) ?? []
    list.push(entry)
    byDate.set(entry.date, list)
  }

  return [...byDate.entries()]
    .map(([date, dayEntries]) => ({ date, ...sumMacros(dayEntries) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
