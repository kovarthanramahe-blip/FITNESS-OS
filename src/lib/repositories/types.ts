import type { EarnedBadge, XPEvent } from '@/types/gamification'
import type { Habit, HabitEntry } from '@/types/habits'
import type { FoodEntry, NutritionGoal, WaterGoal, WaterLog } from '@/types/nutrition'
import type { BodyMeasurement, PersonalRecord, WeightGoal, WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession } from '@/types/workout'

/**
 * The repository boundary for Phase 7: a read-only view over each domain,
 * satisfiable by either the existing local stores or (once Phase 8 wires
 * it up) Supabase. Writes intentionally stay exactly where they are today
 * — going through workoutStore/progressStore/nutritionStore/habitStore/
 * gamificationStore's own actions — so nothing about how the UI mutates
 * data changes in this phase. This interface only answers "where does a
 * read come from," which is what lets a future cloud-backed read replace
 * a local one without touching the components that call it.
 */

export interface WorkoutRepository {
  getHistory(): Promise<WorkoutHistoryEntry[]>
  getPersonalRecords(): Promise<PersonalRecord[]>
}

export interface ProgressRepository {
  getWeightLogs(): Promise<WeightLog[]>
  getWeightGoal(): Promise<WeightGoal | null>
  getMeasurements(): Promise<BodyMeasurement[]>
}

export interface NutritionRepository {
  getFoodEntries(): Promise<FoodEntry[]>
  getGoal(): Promise<NutritionGoal | null>
  getWaterLogs(): Promise<WaterLog[]>
  getWaterGoal(): Promise<WaterGoal | null>
}

export interface HabitRepository {
  getHabits(): Promise<Habit[]>
  getEntries(): Promise<HabitEntry[]>
}

export interface GamificationRepository {
  getXpEvents(): Promise<XPEvent[]>
  getEarnedBadges(): Promise<EarnedBadge[]>
  getCompletedChallengeIds(): Promise<string[]>
}

export interface Repositories {
  workout: WorkoutRepository
  progress: ProgressRepository
  nutrition: NutritionRepository
  habit: HabitRepository
  gamification: GamificationRepository
}

/**
 * Part 5 write surface — cloud-only. Local writes intentionally continue to
 * go straight through each store's own actions (see the comment above), so
 * these methods exist solely on the cloud repositories returned by
 * `createCloudXRepository`, never on `local/index.ts` or the generic
 * `Repositories` shape used by `getRepositories()`.
 */
export interface WorkoutRepositoryWriter {
  /** Upserts the session (by client_session_id) then replaces its exercises/sets — idempotent on retry. */
  saveCompletedSession(session: WorkoutSession, historyEntry: WorkoutHistoryEntry): Promise<void>
  savePersonalRecord(record: PersonalRecord): Promise<void>
  /**
   * One-time local-duplicate cleanup support (see docs/SYNC_STRATEGY.md):
   * the raw `personal_records.id` primary keys for this user — never a
   * `client_record_id`. A local record's id can only ever equal one of
   * these if it's a leftover copy from before `mapPersonalRecordRow` was
   * fixed to key on `client_record_id`; nothing else could produce that id
   * shape locally.
   */
  getPersonalRecordServerIds(): Promise<string[]>
}

export interface ProgressRepositoryWriter {
  saveWeightLog(log: WeightLog): Promise<void>
  deleteWeightLog(clientLogId: string): Promise<void>
  saveWeightGoal(goal: WeightGoal): Promise<void>
  saveMeasurement(measurement: BodyMeasurement): Promise<void>
  deleteMeasurement(clientMeasurementId: string): Promise<void>
  /** One-time local-duplicate cleanup support — see WorkoutRepositoryWriter.getPersonalRecordServerIds. */
  getWeightLogServerIds(): Promise<string[]>
  /** One-time local-duplicate cleanup support — see WorkoutRepositoryWriter.getPersonalRecordServerIds. */
  getMeasurementServerIds(): Promise<string[]>
}

export interface NutritionRepositoryWriter {
  saveFoodEntry(entry: FoodEntry): Promise<void>
  deleteFoodEntry(clientEntryId: string): Promise<void>
  saveGoal(goal: NutritionGoal): Promise<void>
  saveWaterLog(log: WaterLog): Promise<void>
  deleteWaterLog(clientLogId: string): Promise<void>
  saveWaterGoal(goal: WaterGoal): Promise<void>
  /** One-time local-duplicate cleanup support — see WorkoutRepositoryWriter.getPersonalRecordServerIds. */
  getFoodEntryServerIds(): Promise<string[]>
  /** One-time local-duplicate cleanup support — see WorkoutRepositoryWriter.getPersonalRecordServerIds. */
  getWaterLogServerIds(): Promise<string[]>
}

export interface HabitRepositoryWriter {
  saveHabit(habit: Habit): Promise<void>
  deleteHabit(clientHabitId: string): Promise<void>
  /** Also upserts `habit` first so the parent row is guaranteed to exist before the entry references it. */
  saveEntry(entry: HabitEntry, habit: Habit): Promise<void>
  deleteEntry(clientEntryId: string): Promise<void>
  /**
   * One-time local-duplicate cleanup support: maps every `habits.id`
   * (server row id) for this user to its `client_habit_id`. Used both to
   * find legacy server-id-keyed habit duplicates and to re-point any
   * surviving habit entry whose `habitId` still holds a legacy server habit
   * id (the old `mapHabitEntryRow` bug — see its doc comment) back to the
   * canonical client habit id.
   */
  getHabitServerIdToClientId(): Promise<Record<string, string>>
  /** One-time local-duplicate cleanup support — see WorkoutRepositoryWriter.getPersonalRecordServerIds. */
  getHabitEntryServerIds(): Promise<string[]>
}

export interface GamificationRepositoryWriter {
  ensureProfile(createdAt: string): Promise<void>
  saveXpEvents(events: XPEvent[]): Promise<void>
  saveEarnedBadges(badges: EarnedBadge[]): Promise<void>
  saveCompletedChallenges(instanceIds: string[], completedAt: string): Promise<void>
}
