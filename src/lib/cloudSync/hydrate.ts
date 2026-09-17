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
import {
  mergeHabitFromCloud,
  purgeLegacyServerIdHabitEntries,
  purgeLegacyServerIdHabits,
  purgeLegacyServerIdWaterLogs,
} from '@/lib/habitStore'
import { mergeNutritionFromCloud, purgeLegacyServerIdFoodEntries } from '@/lib/nutritionStore'
import { mergeProgressFromCloud, purgeLegacyServerIdMeasurements, purgeLegacyServerIdWeightLogs } from '@/lib/progressStore'
import {
  createCloudGamificationRepository,
  createCloudHabitRepository,
  createCloudNutritionRepository,
  createCloudProgressRepository,
  createCloudWorkoutRepository,
} from '@/lib/repositories/cloud'
import { mergeWorkoutFromCloud, purgeLegacyServerIdPersonalRecords } from '@/lib/workoutStore'

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
    const [history, personalRecords, legacyPersonalRecordServerIds] = await Promise.all([
      repo.getHistory(),
      repo.getPersonalRecords(),
      repo.getPersonalRecordServerIds(),
    ])
    const { localOnlyPersonalRecords } = mergeWorkoutFromCloud({ history, personalRecords })
    purgeLegacyServerIdPersonalRecords(legacyPersonalRecordServerIds)

    // A record purged as a legacy duplicate must never be re-pushed — its
    // id is a stale server row id, not a real client id, so upserting it
    // as `client_record_id` would create a genuine new duplicate in the
    // cloud, which today has none.
    const legacyIds = new Set(legacyPersonalRecordServerIds)
    const recordsToPush = localOnlyPersonalRecords.filter((record) => !legacyIds.has(record.id))
    await Promise.all(recordsToPush.map((record) => pushPersonalRecord(record)))
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate workout data from cloud:', error)
  }
}

async function hydrateProgress(userId: string): Promise<void> {
  try {
    const repo = createCloudProgressRepository(userId)
    const [weightLogs, weightGoal, measurements, legacyWeightLogServerIds, legacyMeasurementServerIds] = await Promise.all([
      repo.getWeightLogs(),
      repo.getWeightGoal(),
      repo.getMeasurements(),
      repo.getWeightLogServerIds(),
      repo.getMeasurementServerIds(),
    ])
    const { localOnlyWeightLogs, localOnlyMeasurements, weightGoalToPush } = mergeProgressFromCloud({
      weightLogs,
      weightGoal,
      measurements,
    })
    purgeLegacyServerIdWeightLogs(legacyWeightLogServerIds)
    purgeLegacyServerIdMeasurements(legacyMeasurementServerIds)

    // See hydrateWorkout's comment: never re-push a purged legacy id.
    const legacyLogIds = new Set(legacyWeightLogServerIds)
    const legacyMeasurementIds = new Set(legacyMeasurementServerIds)
    await Promise.all([
      ...localOnlyWeightLogs.filter((log) => !legacyLogIds.has(log.id)).map((log) => pushWeightLog(log)),
      ...localOnlyMeasurements
        .filter((measurement) => !legacyMeasurementIds.has(measurement.id))
        .map((measurement) => pushMeasurement(measurement)),
      weightGoalToPush ? pushWeightGoal(weightGoalToPush) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate progress data from cloud:', error)
  }
}

async function hydrateNutrition(userId: string): Promise<void> {
  try {
    const repo = createCloudNutritionRepository(userId)
    const [entries, goal, legacyFoodEntryServerIds] = await Promise.all([
      repo.getFoodEntries(),
      repo.getGoal(),
      repo.getFoodEntryServerIds(),
    ])
    const { localOnlyEntries, goalToPush } = mergeNutritionFromCloud({ entries, goal })
    purgeLegacyServerIdFoodEntries(legacyFoodEntryServerIds)

    // See hydrateWorkout's comment: never re-push a purged legacy id.
    const legacyIds = new Set(legacyFoodEntryServerIds)
    await Promise.all([
      ...localOnlyEntries.filter((entry) => !legacyIds.has(entry.id)).map((entry) => pushFoodEntry(entry)),
      goalToPush ? pushNutritionGoal(goalToPush) : Promise.resolve(),
    ])
  } catch (error) {
    console.error('[Fitness OS] Failed to hydrate nutrition data from cloud:', error)
  }
}

async function hydrateHabits(userId: string): Promise<void> {
  try {
    const repo = createCloudHabitRepository(userId)
    const [habits, entries, waterLogs, waterGoal, habitServerIdToClientId, legacyEntryServerIds, legacyWaterLogServerIds] =
      await Promise.all([
        repo.getHabits(),
        repo.getEntries(),
        repo.getWaterLogs(),
        repo.getWaterGoal(),
        repo.getHabitServerIdToClientId(),
        repo.getHabitEntryServerIds(),
        repo.getWaterLogServerIds(),
      ])
    const { localOnlyHabits, localOnlyEntries, localOnlyWaterLogs, waterGoalToPush } = mergeHabitFromCloud({
      habits,
      entries,
      waterLogs,
      waterGoal,
    })
    purgeLegacyServerIdHabits(Object.keys(habitServerIdToClientId))
    purgeLegacyServerIdHabitEntries(legacyEntryServerIds, habitServerIdToClientId)
    purgeLegacyServerIdWaterLogs(legacyWaterLogServerIds)

    // See hydrateWorkout's comment: never re-push a purged legacy id. An
    // entry paired with a legacy-id habit is excluded too, since
    // pushHabitEntry re-upserts its habit — doing that with a legacy
    // server id as the "client" id would create a genuine new duplicate
    // habit row in the cloud.
    const legacyHabitIds = new Set(Object.keys(habitServerIdToClientId))
    const legacyEntryIds = new Set(legacyEntryServerIds)
    const legacyWaterLogIds = new Set(legacyWaterLogServerIds)
    await Promise.all([
      ...localOnlyHabits.filter((habit) => !legacyHabitIds.has(habit.id)).map((habit) => pushHabit(habit)),
      ...localOnlyEntries
        .filter(({ entry, habit }) => !legacyEntryIds.has(entry.id) && !legacyHabitIds.has(habit.id))
        .map(({ entry, habit }) => pushHabitEntry(entry, habit)),
      ...localOnlyWaterLogs.filter((log) => !legacyWaterLogIds.has(log.id)).map((log) => pushWaterLog(log)),
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
