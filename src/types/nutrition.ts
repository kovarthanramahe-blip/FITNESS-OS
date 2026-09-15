export interface MacroTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface Meal {
  id: string
  name: string
  time: string
  items: string[]
  totals: MacroTotals
}

export interface NutritionDay {
  target: MacroTotals
  consumed: MacroTotals
  waterMl: number
  waterTargetMl: number
  meals: Meal[]
}
