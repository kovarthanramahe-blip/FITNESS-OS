import { sampleFoodLibrary } from '@/data/foodLibrary'
import type { FoodEntry, FoodItem, MealType, NutritionGoal, WaterGoal, WaterLog } from '@/types/nutrition'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function foodByName(name: string): FoodItem {
  const food = sampleFoodLibrary.find((candidate) => candidate.name === name)
  if (!food) throw new Error(`Missing sample food "${name}"`)
  return food
}

let seedCounter = 0

const MEAL_HOUR: Record<MealType, number> = { breakfast: 8, lunch: 13, dinner: 20, snacks: 17 }

function entry(daysAgo: number, meal: MealType, foodName: string, quantity: number): FoodEntry {
  const food = foodByName(foodName)
  seedCounter += 1
  const date = daysAgoDateString(daysAgo)
  const hour = String(MEAL_HOUR[meal]).padStart(2, '0')
  return {
    id: `seed-food-${seedCounter}`,
    foodId: food.id,
    foodName: food.name,
    meal,
    quantity,
    servingUnit: food.servingUnit,
    calories: Math.round(food.calories * quantity),
    protein: Math.round(food.protein * quantity * 10) / 10,
    carbohydrates: Math.round(food.carbohydrates * quantity * 10) / 10,
    fat: Math.round(food.fat * quantity * 10) / 10,
    fiber: Math.round(food.fiber * quantity * 10) / 10,
    date,
    createdAt: `${date}T${hour}:00:00.000Z`,
  }
}

/** A handful of recent days of sample entries, so history charts and Dashboard totals have real data to render. */
export const mockFoodEntries: FoodEntry[] = [
  // Today
  entry(0, 'breakfast', 'Eggs', 1),
  entry(0, 'breakfast', 'Oats (dry)', 1),
  entry(0, 'lunch', 'Chicken Breast (cooked)', 1.5),
  entry(0, 'lunch', 'White Rice (cooked)', 1),
  entry(0, 'snacks', 'Greek Yogurt (plain)', 1),

  // Yesterday
  entry(1, 'breakfast', 'Banana', 1),
  entry(1, 'breakfast', 'Milk (whole)', 1),
  entry(1, 'lunch', 'Dal (cooked lentils)', 1),
  entry(1, 'lunch', 'White Rice (cooked)', 1),
  entry(1, 'dinner', 'Paneer', 1),
  entry(1, 'dinner', 'Bread (whole wheat)', 2),

  // 2 days ago
  entry(2, 'breakfast', 'Eggs', 2),
  entry(2, 'lunch', 'Chicken Breast (cooked)', 1),
  entry(2, 'lunch', 'White Rice (cooked)', 1),
  entry(2, 'snacks', 'Banana', 1),

  // 3 days ago
  entry(3, 'breakfast', 'Oats (dry)', 1),
  entry(3, 'breakfast', 'Milk (whole)', 1),
  entry(3, 'dinner', 'Dal (cooked lentils)', 1),
  entry(3, 'dinner', 'Bread (whole wheat)', 1),

  // 7 days ago
  entry(7, 'breakfast', 'Greek Yogurt (plain)', 1),
  entry(7, 'lunch', 'Paneer', 1),
  entry(7, 'lunch', 'White Rice (cooked)', 1),

  // 14 days ago
  entry(14, 'breakfast', 'Eggs', 2),
  entry(14, 'lunch', 'Chicken Breast (cooked)', 1),
  entry(14, 'lunch', 'White Rice (cooked)', 1),
  entry(14, 'dinner', 'Dal (cooked lentils)', 1),
]

export const mockNutritionGoal: NutritionGoal = {
  dailyCalories: 2200,
  proteinGrams: 160,
  carbohydrateGrams: 220,
  fatGrams: 70,
  fiberGrams: 30,
}

// ---------------------------------------------------------------------------
// Water — moved here from the old habit-store mock data now that water is a
// Nutrition metric. Uses local-calendar-date arithmetic (unlike this file's
// own `daysAgoDateString` above, which is UTC-based) since these dates back
// real water-log fixtures rather than just display labels.
// ---------------------------------------------------------------------------

export const mockWaterGoal: WaterGoal = {
  goalMl: 2500,
  preferredUnit: 'l',
}

function buildMockWaterLogs(): WaterLog[] {
  const logs: WaterLog[] = []
  let counter = 0
  const amounts = [250, 500, 250, 500, 250]
  const today = getTodayDateString()

  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = addDaysToDateString(today, -daysAgo)
    const entriesToday = daysAgo === 0 ? amounts.slice(0, 3) : amounts
    for (const [index, amountMl] of entriesToday.entries()) {
      counter += 1
      logs.push({
        id: `seed-water-${counter}`,
        date,
        amountMl,
        createdAt: `${date}T${String(7 + index * 3).padStart(2, '0')}:00:00.000Z`,
      })
    }
  }

  return logs
}

export const mockWaterLogs: WaterLog[] = buildMockWaterLogs()
