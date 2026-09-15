import { resetGamificationData } from '@/lib/gamificationStore'
import { resetHabitData } from '@/lib/habitStore'
import { resetNutritionData } from '@/lib/nutritionStore'
import { resetProgressData } from '@/lib/progressStore'
import { resetWorkoutData } from '@/lib/workoutStore'

/**
 * Settings > Data & Privacy > "Reset Fitness Data". Wipes every
 * user-generated fitness record (workouts, weight/measurements, nutrition
 * entries, habits/water, XP/badges/challenges) for the currently active
 * scope back to zero. Never touches the auth account, the `profiles` row,
 * or the static exercise/program catalogue — those live entirely outside
 * these five stores.
 */
export function resetAllFitnessData(): void {
  resetWorkoutData()
  resetProgressData()
  resetNutritionData()
  resetHabitData()
  resetGamificationData()
}
