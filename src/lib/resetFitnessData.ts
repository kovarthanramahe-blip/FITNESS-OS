import { resetActivityData } from '@/lib/activityStore'
import { resetGamificationData } from '@/lib/gamificationStore'
import { resetHabitData } from '@/lib/habitStore'
import { resetNutritionData } from '@/lib/nutritionStore'
import { resetProgressData } from '@/lib/progressStore'
import { deleteAllCloudUserData } from '@/lib/repositories/cloud'
import { getCurrentUserId } from '@/lib/storageScope'
import { isSupabaseConfigured } from '@/lib/supabase'
import { resetWorkoutData } from '@/lib/workoutStore'

/**
 * Settings > Data & Privacy > "Reset Fitness Data". Wipes every
 * user-generated fitness record (workouts, weight/measurements, nutrition
 * entries/water, habits, activity entries/steps, XP/badges/challenges) for
 * the currently active scope back to zero. Never touches the auth account,
 * the `profiles` row, or the static exercise/program catalogue — those
 * live entirely outside these stores.
 *
 * When signed in, this also clears the same data in Supabase — without
 * it, the very next sign-in would pull the "reset" data right back down
 * via cloud hydration. The cloud delete runs first and is awaited (unlike
 * every other cloud write in this app) since this is a rare, deliberate,
 * already-confirmed destructive action the UI shows a loading state for;
 * a network failure here is logged and local reset still proceeds, since
 * failing to reset what's already visible to the user would be worse than
 * a stale cloud copy that the next successful sync will overwrite anyway.
 */
export async function resetAllFitnessData(): Promise<void> {
  const userId = getCurrentUserId()
  if (userId && isSupabaseConfigured) {
    try {
      await deleteAllCloudUserData(userId)
    } catch (error) {
      console.error('[Fitness OS] Failed to clear cloud data during reset:', error)
    }
  }

  resetWorkoutData()
  resetProgressData()
  resetNutritionData()
  resetHabitData()
  resetActivityData()
  resetGamificationData()
}
