import {
  createCloudGamificationRepository,
  createCloudHabitRepository,
  createCloudNutritionRepository,
  createCloudProgressRepository,
  createCloudWorkoutRepository,
} from '@/lib/repositories/cloud'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/storageScope'
import type { EarnedBadge, XPEvent } from '@/types/gamification'
import type { Habit, HabitEntry, WaterGoal, WaterLog } from '@/types/habits'
import type { FoodEntry, NutritionGoal } from '@/types/nutrition'
import type { BodyMeasurement, PersonalRecord, WeightGoal, WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession } from '@/types/workout'

/**
 * Best-effort background writes to the authenticated user's cloud data —
 * called from each store's own mutating actions (never the other way
 * around, which would create an import cycle). Local writes always
 * complete synchronously before any of these run; a network failure here
 * only logs, it never surfaces as a UI error or rolls back the local
 * change. `null` whenever Supabase isn't configured or nobody is signed
 * in — the local-only experience is completely unaffected either way.
 */

function activeUserId(): string | null {
  if (!isSupabaseConfigured) return null
  return getCurrentUserId()
}

function report(context: string, error: unknown): void {
  console.error(`[Fitness OS] Cloud sync failed (${context}):`, error)
}

export async function pushWeightLog(log: WeightLog): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudProgressRepository(userId).saveWeightLog(log)
  } catch (error) {
    report('saveWeightLog', error)
  }
}

export async function pushWeightLogDelete(clientLogId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudProgressRepository(userId).deleteWeightLog(clientLogId)
  } catch (error) {
    report('deleteWeightLog', error)
  }
}

export async function pushWeightGoal(goal: WeightGoal): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudProgressRepository(userId).saveWeightGoal(goal)
  } catch (error) {
    report('saveWeightGoal', error)
  }
}

export async function pushMeasurement(measurement: BodyMeasurement): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudProgressRepository(userId).saveMeasurement(measurement)
  } catch (error) {
    report('saveMeasurement', error)
  }
}

export async function pushMeasurementDelete(clientMeasurementId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudProgressRepository(userId).deleteMeasurement(clientMeasurementId)
  } catch (error) {
    report('deleteMeasurement', error)
  }
}

export async function pushFoodEntry(entry: FoodEntry): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudNutritionRepository(userId).saveFoodEntry(entry)
  } catch (error) {
    report('saveFoodEntry', error)
  }
}

export async function pushFoodEntryDelete(clientEntryId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudNutritionRepository(userId).deleteFoodEntry(clientEntryId)
  } catch (error) {
    report('deleteFoodEntry', error)
  }
}

export async function pushNutritionGoal(goal: NutritionGoal): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudNutritionRepository(userId).saveGoal(goal)
  } catch (error) {
    report('saveNutritionGoal', error)
  }
}

export async function pushHabit(habit: Habit): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).saveHabit(habit)
  } catch (error) {
    report('saveHabit', error)
  }
}

export async function pushHabitDelete(clientHabitId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).deleteHabit(clientHabitId)
  } catch (error) {
    report('deleteHabit', error)
  }
}

export async function pushHabitEntry(entry: HabitEntry, habit: Habit): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).saveEntry(entry, habit)
  } catch (error) {
    report('saveHabitEntry', error)
  }
}

export async function pushHabitEntryDelete(clientEntryId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).deleteEntry(clientEntryId)
  } catch (error) {
    report('deleteHabitEntry', error)
  }
}

export async function pushWaterLog(log: WaterLog): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).saveWaterLog(log)
  } catch (error) {
    report('saveWaterLog', error)
  }
}

export async function pushWaterLogDelete(clientLogId: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).deleteWaterLog(clientLogId)
  } catch (error) {
    report('deleteWaterLog', error)
  }
}

export async function pushWaterGoal(goal: WaterGoal): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudHabitRepository(userId).saveWaterGoal(goal)
  } catch (error) {
    report('saveWaterGoal', error)
  }
}

export async function pushCompletedSession(session: WorkoutSession, historyEntry: WorkoutHistoryEntry): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudWorkoutRepository(userId).saveCompletedSession(session, historyEntry)
  } catch (error) {
    report('saveCompletedSession', error)
  }
}

export async function pushPersonalRecord(record: PersonalRecord): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudWorkoutRepository(userId).savePersonalRecord(record)
  } catch (error) {
    report('savePersonalRecord', error)
  }
}

export async function pushGamificationProfile(createdAt: string): Promise<void> {
  const userId = activeUserId()
  if (!userId) return
  try {
    await createCloudGamificationRepository(userId).ensureProfile(createdAt)
  } catch (error) {
    report('ensureGamificationProfile', error)
  }
}

export async function pushXpEvents(events: XPEvent[]): Promise<void> {
  const userId = activeUserId()
  if (!userId || events.length === 0) return
  try {
    await createCloudGamificationRepository(userId).saveXpEvents(events)
  } catch (error) {
    report('saveXpEvents', error)
  }
}

export async function pushEarnedBadges(badges: EarnedBadge[]): Promise<void> {
  const userId = activeUserId()
  if (!userId || badges.length === 0) return
  try {
    await createCloudGamificationRepository(userId).saveEarnedBadges(badges)
  } catch (error) {
    report('saveEarnedBadges', error)
  }
}

export async function pushCompletedChallenges(instanceIds: string[], completedAt: string): Promise<void> {
  const userId = activeUserId()
  if (!userId || instanceIds.length === 0) return
  try {
    await createCloudGamificationRepository(userId).saveCompletedChallenges(instanceIds, completedAt)
  } catch (error) {
    report('saveCompletedChallenges', error)
  }
}
