export type { TimeRange as NutritionTimeRange } from './shared'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

/**
 * A food definition — either from the sample library (data/foodLibrary.ts)
 * or created ad hoc by the user. Values are common estimates, never
 * presented as medically precise.
 */
export interface FoodItem {
  id: string
  name: string
  servingSize: number
  servingUnit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  sugar?: number
  sodium?: number
}

/**
 * A single logged food entry. Carries its own macro snapshot (and a
 * `foodName` snapshot) rather than a live reference to `FoodItem`, so
 * editing or removing a library food never rewrites history.
 */
export interface FoodEntry {
  id: string
  foodId: string
  foodName: string
  meal: MealType
  quantity: number
  servingUnit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  /** ISO date string (yyyy-mm-dd) the entry is logged against. */
  date: string
  /** ISO timestamp the entry was created. */
  createdAt: string
}

export interface MacroTotals {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
}

/** Derived, read-only summary for one day — never stored directly. */
export interface DailyNutrition {
  date: string
  totals: MacroTotals
  entriesByMeal: Record<MealType, FoodEntry[]>
}

/**
 * The user's daily macro targets. Neutral by design — supports
 * maintenance, weight loss, or weight gain without assuming any one goal.
 */
export interface NutritionGoal {
  dailyCalories: number
  proteinGrams: number
  carbohydrateGrams: number
  fatGrams: number
  fiberGrams?: number
}

/** A goal reshaped into the same units as `MacroTotals`, for progress math. */
export interface MacroTargets {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber?: number
}

// ---------------------------------------------------------------------------
// Water tracking — a Nutrition metric like calories/protein/carbs/fat: an
// append-only log of dated entries, never a single mutable "today" value.
// ---------------------------------------------------------------------------

export interface WaterLog {
  id: string
  /** ISO date string (yyyy-mm-dd) the log is for — never derived from another date. */
  date: string
  amountMl: number
  /** ISO timestamp. */
  createdAt: string
}

export type WaterUnit = 'ml' | 'l'

export interface WaterGoal {
  /** Canonical storage unit — always millilitres, regardless of display preference. */
  goalMl: number
  /** The user's preferred display unit; the goal itself is still stored in ml. */
  preferredUnit: WaterUnit
}
