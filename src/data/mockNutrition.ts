import type { NutritionDay } from '@/types/nutrition'

export const mockNutritionDay: NutritionDay = {
  target: { calories: 2400, proteinG: 160, carbsG: 260, fatG: 75 },
  consumed: { calories: 1640, proteinG: 118, carbsG: 165, fatG: 48 },
  waterMl: 1800,
  waterTargetMl: 3000,
  meals: [
    {
      id: 'meal-breakfast',
      name: 'Breakfast',
      time: '7:30 AM',
      items: ['3 whole eggs', 'Oats with banana', 'Black coffee'],
      totals: { calories: 480, proteinG: 32, carbsG: 52, fatG: 16 },
    },
    {
      id: 'meal-lunch',
      name: 'Lunch',
      time: '1:00 PM',
      items: ['Grilled chicken breast', 'Brown rice', 'Mixed vegetables'],
      totals: { calories: 620, proteinG: 48, carbsG: 68, fatG: 14 },
    },
    {
      id: 'meal-snack',
      name: 'Snack',
      time: '4:30 PM',
      items: ['Whey protein shake', 'Almonds'],
      totals: { calories: 310, proteinG: 30, carbsG: 15, fatG: 12 },
    },
    {
      id: 'meal-dinner',
      name: 'Dinner',
      time: '8:00 PM',
      items: ['Salmon fillet', 'Sweet potato', 'Salad'],
      totals: { calories: 230, proteinG: 8, carbsG: 30, fatG: 6 },
    },
  ],
}
