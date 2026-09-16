import {
  pushCompletedChallenges,
  pushEarnedBadges,
  pushGamificationProfile,
  pushHabit,
  pushHabitEntry,
  pushMeasurement,
  pushNutritionGoal,
  pushPersonalRecord,
  pushFoodEntry,
  pushWaterGoal,
  pushWaterLog,
  pushWeightGoal,
  pushWeightLog,
  pushXpEvents,
} from '@/lib/cloudSync/push'
import { getGamificationState, mergeGamificationFromCloud } from '@/lib/gamificationStore'
import { mergeHabitFromCloud } from '@/lib/habitStore'
import { mergeNutritionFromCloud } from '@/lib/nutritionStore'
import { mergeProgressFromCloud } from '@/lib/progressStore'
import {
  createCloudGamificationRepository,
  createCloudHabitRepository,
  createCloudNutritionRepository,
  createCloudProgressRepository,
  createCloudWorkoutRepository,
} from '@/lib/repositories/cloud'
import { mergeWorkoutFromCloud } from '@/lib/workoutStore'

/**
 * Runs once per sign-in (see useCloudSync) to make the local scope for
 * `userId` reflect the same picture the cloud has, in both directions:
 *
 * - A fresh device/browser has an empty local scope by construction (see
 *   storageScope's zero-state design), so pulling cloud data down and
 *   merging it in is always safe — there's nothing local to lose.
 * - Returning to a device that already has local data (or created some
 *   while a network call was in flight) merges rather than overwrites:
 *   cloud wins on a shared id, every local-only item is kept, and is then
 *   pushed back up so both sides end up consistent.
 *
 * This deliberately stops short of full two-way conflict resolution
 * (concurrently editing the *same* record from two devices) — see
 * docs/SYNC_STRATEGY.md's phase 10. Each domain's failure is isolated so
 * one table having an issue never blocks the others from hydrating.
 */
export async function hydrateFromCloud(userId: string): Promise<void> {
  await Promise.allSettled([
    hydrateWorkout(userId),
    hydrateProgress(userId),
    hydrateNutrition(userId),
    hydrateHabits(userId),
    hydrateGamification(userId),
  ])
}

async function hydrateWorkout(userId: string): Promise<void> {
  try {
    const repo = createCloudWorkoutRepository(userId)
    const [history, personalRecords] = await Promise.all([repo.getHistory(), repo.getPersonalRecords()])
    const { localOnlyPersonalRecords } = mergeWorkoutFromCloud({ history, personalRecords })
    await Promise.all(localOnlyPersonalRecords.map((record) => pushPersonalRecord(record)))
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate workout data from cloud:', error)
  }
}

async function hydrateProgress(userId: string): Promise<void> {
  try {
    const repo = createCloudProgressRepository(userId)
    const [weightLogs, weightGoal, measurements] = await Promise.all([
      repo.getWeightLogs(),
      repo.getWeightGoal(),
      repo.getMeasurements(),
    ])
    const { localOnlyWeightLogs, localOnlyMeasurements, weightGoalToPush } = mergeProgressFromCloud({
      weightLogs,
      weightGoal,
      measurements,
    })
    await Promise.all([
      ...localOnlyWeightLogs.map((log) => pushWeightLog(log)),
      ...localOnlyMeasurements.map((measurement) => pushMeasurement(measurement)),
      weightGoalToPush ? pushWeightGoal(weightGoalToPush) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate progress data from cloud:', error)
  }
}

async function hydrateNutrition(userId: string): Promise<void> {
  try {
    const repo = createCloudNutritionRepository(userId)
    const [entries, goal] = await Promise.all([repo.getFoodEntries(), repo.getGoal()])
    const { localOnlyEntries, goalToPush } = mergeNutritionFromCloud({ entries, goal })
    await Promise.all([
      ...localOnlyEntries.map((entry) => pushFoodEntry(entry)),
      goalToPush ? pushNutritionGoal(goalToPush) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate nutrition data from cloud:', error)
  }
}

async function hydrateHabits(userId: string): Promise<void> {
  try {
    const repo = createCloudHabitRepository(userId)
    const [habits, entries, waterLogs, waterGoal] = await Promise.all([
      repo.getHabits(),
      repo.getEntries(),
      repo.getWaterLogs(),
      repo.getWaterGoal(),
    ])
    const { localOnlyHabits, localOnlyEntries, localOnlyWaterLogs, waterGoalToPush } = mergeHabitFromCloud({
      habits,
      entries,
      waterLogs,
      waterGoal,
    })
    await Promise.all([
      ...localOnlyHabits.map((habit) => pushHabit(habit)),
      ...localOnlyEntries.map(({ entry, habit }) => pushHabitEntry(entry, habit)),
      ...localOnlyWaterLogs.map((log) => pushWaterLog(log)),
      waterGoalToPush ? pushWaterGoal(waterGoalToPush) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate habit data from cloud:', error)
  }
}

async function hydrateGamification(userId: string): Promise<void> {
  try {
    const repo = createCloudGamificationRepository(userId)
    await pushGamificationProfile(getGamificationState().createdAt)
    const [xpEvents, earnedBadges, completedChallengeIds] = await Promise.all([
      repo.getXpEvents(),
      repo.getEarnedBadges(),
      repo.getCompletedChallengeIds(),
    ])
    const { localOnlyXpEvents, localOnlyEarnedBadges, localOnlyChallengeIds } = mergeGamificationFromCloud({
      xpEvents,
      earnedBadges,
      completedChallengeIds,
    })
    await Promise.all([
      pushXpEvents(localOnlyXpEvents),
      pushEarnedBadges(localOnlyEarnedBadges),
      pushCompletedChallenges(localOnlyChallengeIds, new Date().toISOString()),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate gamification data from cloud:', error)
  }
}
