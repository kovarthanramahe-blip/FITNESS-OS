import type { FoodItem } from '@/types/nutrition'

/**
 * Common sample/development foods, keyed by everyday serving sizes.
 *
 * These are rough, commonly-cited estimates for planning purposes only —
 * not medically precise nutrition-label data. Users can still log any
 * custom food with their own values; this library never limits entry to
 * only these items.
 */
export const sampleFoodLibrary: FoodItem[] = [
  {
    id: 'food-eggs',
    name: 'Eggs',
    servingSize: 2,
    servingUnit: 'large eggs',
    calories: 140,
    protein: 12,
    carbohydrates: 1,
    fat: 10,
    fiber: 0,
  },
  {
    id: 'food-chicken-breast',
    name: 'Chicken Breast (cooked)',
    servingSize: 100,
    servingUnit: 'g',
    calories: 165,
    protein: 31,
    carbohydrates: 0,
    fat: 3.6,
    fiber: 0,
  },
  {
    id: 'food-rice',
    name: 'White Rice (cooked)',
    servingSize: 1,
    servingUnit: 'cup',
    calories: 205,
    protein: 4.3,
    carbohydrates: 45,
    fat: 0.4,
    fiber: 0.6,
  },
  {
    id: 'food-oats',
    name: 'Oats (dry)',
    servingSize: 40,
    servingUnit: 'g',
    calories: 150,
    protein: 5,
    carbohydrates: 27,
    fat: 3,
    fiber: 4,
  },
  {
    id: 'food-banana',
    name: 'Banana',
    servingSize: 1,
    servingUnit: 'medium',
    calories: 105,
    protein: 1.3,
    carbohydrates: 27,
    fat: 0.4,
    fiber: 3.1,
    sugar: 14,
  },
  {
    id: 'food-milk',
    name: 'Milk (whole)',
    servingSize: 1,
    servingUnit: 'cup',
    calories: 149,
    protein: 8,
    carbohydrates: 12,
    fat: 8,
    fiber: 0,
    sugar: 12,
  },
  {
    id: 'food-greek-yogurt',
    name: 'Greek Yogurt (plain)',
    servingSize: 170,
    servingUnit: 'g',
    calories: 100,
    protein: 17,
    carbohydrates: 6,
    fat: 0.7,
    fiber: 0,
    sugar: 4,
  },
  {
    id: 'food-paneer',
    name: 'Paneer',
    servingSize: 100,
    servingUnit: 'g',
    calories: 265,
    protein: 18,
    carbohydrates: 3.4,
    fat: 20,
    fiber: 0,
  },
  {
    id: 'food-dal',
    name: 'Dal (cooked lentils)',
    servingSize: 1,
    servingUnit: 'cup',
    calories: 230,
    protein: 18,
    carbohydrates: 40,
    fat: 0.8,
    fiber: 16,
  },
  {
    id: 'food-bread',
    name: 'Bread (whole wheat)',
    servingSize: 1,
    servingUnit: 'slice',
    calories: 80,
    protein: 4,
    carbohydrates: 14,
    fat: 1,
    fiber: 2,
    sugar: 1.5,
  },
]

export function getFoodById(foodId: string): FoodItem | undefined {
  return sampleFoodLibrary.find((food) => food.id === foodId)
}
