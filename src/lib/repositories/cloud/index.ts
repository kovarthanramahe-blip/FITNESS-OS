import { supabase } from '@/lib/supabase'
import type { ChallengeCompletionRow } from '@/types/supabase'
import type { EarnedBadge, XPEvent } from '@/types/gamification'
import type { Habit, HabitEntry, WaterGoal, WaterLog } from '@/types/habits'
import type { FoodEntry, NutritionGoal } from '@/types/nutrition'
import type { BodyMeasurement, PersonalRecord, WeightGoal, WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession } from '@/types/workout'
import type {
  GamificationRepository,
  GamificationRepositoryWriter,
  HabitRepository,
  HabitRepositoryWriter,
  NutritionRepository,
  NutritionRepositoryWriter,
  ProgressRepository,
  ProgressRepositoryWriter,
  Repositories,
  WorkoutRepository,
  WorkoutRepositoryWriter,
} from '@/lib/repositories/types'
import {
  mapEarnedBadgeRow,
  mapFoodEntryRow,
  mapHabitEntryRow,
  mapHabitRow,
  mapMeasurementRow,
  mapNutritionGoalRow,
  mapPersonalRecordRow,
  mapWaterGoalRow,
  mapWaterLogRow,
  mapWeightGoalRow,
  mapWeightLogRow,
  mapWorkoutSessionRow,
  mapXpEventRow,
  toChallengeCompletionRow,
  toEarnedBadgeRow,
  toFoodEntryRow,
  toHabitEntryRow,
  toHabitRow,
  toMeasurementRow,
  toNutritionGoalRow,
  toPersonalRecordRow,
  toWaterGoalRow,
  toWaterLogRow,
  toWeightGoalRow,
  toWeightLogRow,
  toWorkoutExerciseRow,
  toWorkoutSessionRow,
  toWorkoutSetRow,
  toXpEventRow,
} from '@/lib/repositories/cloud/mappers'

function client() {
  if (!supabase) {
    throw new Error('Cloud repositories require a configured Supabase client — check isSupabaseConfigured before creating them.')
  }
  return supabase
}

/**
 * Real Supabase-backed reads and (Part 5) writes, one per domain, against
 * the schema in supabase/migrations/. Every read/write below is scoped by
 * an explicit `.eq('user_id', userId)` as defense-in-depth alongside RLS —
 * `userId` always comes from the authenticated session (see
 * src/lib/cloudSync), never from anything client-editable.
 */

export function createCloudWorkoutRepository(userId: string): WorkoutRepository & WorkoutRepositoryWriter {
  return {
    async getHistory() {
      const { data, error } = await client()
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapWorkoutSessionRow)
    },
    async getPersonalRecords() {
      const { data, error } = await client().from('personal_records').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapPersonalRecordRow)
    },
    async saveCompletedSession(session: WorkoutSession, historyEntry: WorkoutHistoryEntry) {
      const { data: sessionRow, error: sessionError } = await client()
        .from('workout_sessions')
        .upsert(toWorkoutSessionRow(userId, session, historyEntry), { onConflict: 'user_id,client_session_id' })
        .select('id')
        .single()
      if (sessionError) throw sessionError
      const sessionServerId = sessionRow.id

      // No client_*_id / unique constraint exists on workout_exercises or
      // workout_sets (see migration 2), so replace-in-place per session is
      // the idempotent strategy: deleting the exercises cascades to their
      // sets, then both are re-inserted fresh from the current session.
      const { error: deleteError } = await client()
        .from('workout_exercises')
        .delete()
        .eq('session_id', sessionServerId)
        .eq('user_id', userId)
      if (deleteError) throw deleteError

      if (session.exercises.length === 0) return

      const exerciseRows = session.exercises.map((exercise, position) =>
        toWorkoutExerciseRow(userId, sessionServerId, exercise, position),
      )
      const { data: insertedExercises, error: exercisesError } = await client()
        .from('workout_exercises')
        .insert(exerciseRows)
        .select('id, position')
      if (exercisesError) throw exercisesError

      const exercisesByPosition = new Map(insertedExercises.map((row) => [row.position, row.id]))
      const setRows = session.exercises.flatMap((exercise, position) => {
        const exerciseServerId = exercisesByPosition.get(position)
        if (!exerciseServerId) return []
        return exercise.sets.map((set) => toWorkoutSetRow(userId, exerciseServerId, set))
      })
      if (setRows.length === 0) return

      const { error: setsError } = await client().from('workout_sets').insert(setRows)
      if (setsError) throw setsError
    },
    async savePersonalRecord(record: PersonalRecord) {
      const { error } = await client()
        .from('personal_records')
        .upsert(toPersonalRecordRow(userId, record), { onConflict: 'user_id,client_record_id' })
      if (error) throw error
    },
    async getPersonalRecordServerIds() {
      const { data, error } = await client().from('personal_records').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
  }
}

export function createCloudProgressRepository(userId: string): ProgressRepository & ProgressRepositoryWriter {
  return {
    async getWeightLogs() {
      const { data, error } = await client()
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: true })
      if (error) throw error
      return (data ?? []).map(mapWeightLogRow)
    },
    async getWeightGoal() {
      const { data, error } = await client().from('weight_goals').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? mapWeightGoalRow(data) : null
    },
    async getMeasurements() {
      const { data, error } = await client().from('body_measurements').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapMeasurementRow)
    },
    async saveWeightLog(log: WeightLog) {
      const { error } = await client()
        .from('weight_logs')
        .upsert(toWeightLogRow(userId, log), { onConflict: 'user_id,client_log_id' })
      if (error) throw error
    },
    async deleteWeightLog(clientLogId: string) {
      const { error } = await client()
        .from('weight_logs')
        .delete()
        .eq('user_id', userId)
        .eq('client_log_id', clientLogId)
      if (error) throw error
    },
    async saveWeightGoal(goal: WeightGoal) {
      const { error } = await client()
        .from('weight_goals')
        .upsert(toWeightGoalRow(userId, goal), { onConflict: 'user_id' })
      if (error) throw error
    },
    async saveMeasurement(measurement: BodyMeasurement) {
      const { error } = await client()
        .from('body_measurements')
        .upsert(toMeasurementRow(userId, measurement), { onConflict: 'user_id,client_measurement_id' })
      if (error) throw error
    },
    async deleteMeasurement(clientMeasurementId: string) {
      const { error } = await client()
        .from('body_measurements')
        .delete()
        .eq('user_id', userId)
        .eq('client_measurement_id', clientMeasurementId)
      if (error) throw error
    },
    async getWeightLogServerIds() {
      const { data, error } = await client().from('weight_logs').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
    async getMeasurementServerIds() {
      const { data, error } = await client().from('body_measurements').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
  }
}

export function createCloudNutritionRepository(userId: string): NutritionRepository & NutritionRepositoryWriter {
  return {
    async getFoodEntries() {
      const { data, error } = await client().from('food_entries').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapFoodEntryRow)
    },
    async getGoal() {
      const { data, error } = await client().from('nutrition_goals').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? mapNutritionGoalRow(data) : null
    },
    async saveFoodEntry(entry: FoodEntry) {
      const { error } = await client()
        .from('food_entries')
        .upsert(toFoodEntryRow(userId, entry), { onConflict: 'user_id,client_entry_id' })
      if (error) throw error
    },
    async deleteFoodEntry(clientEntryId: string) {
      const { error } = await client()
        .from('food_entries')
        .delete()
        .eq('user_id', userId)
        .eq('client_entry_id', clientEntryId)
      if (error) throw error
    },
    async saveGoal(goal: NutritionGoal) {
      const { error } = await client()
        .from('nutrition_goals')
        .upsert(toNutritionGoalRow(userId, goal), { onConflict: 'user_id' })
      if (error) throw error
    },
    async getFoodEntryServerIds() {
      const { data, error } = await client().from('food_entries').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
  }
}

export function createCloudHabitRepository(userId: string): HabitRepository & HabitRepositoryWriter {
  return {
    async getHabits() {
      const { data, error } = await client().from('habits').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapHabitRow)
    },
    async getEntries() {
      // habit_entries.habit_id is the server-side FK, not the client habit
      // id — resolve it back via a parallel read of habits (see
      // mapHabitEntryRow's own doc comment for why this matters for merge
      // correctness).
      const [{ data: entryRows, error: entryError }, { data: habitRows, error: habitError }] = await Promise.all([
        client().from('habit_entries').select('*').eq('user_id', userId),
        client().from('habits').select('*').eq('user_id', userId),
      ])
      if (entryError) throw entryError
      if (habitError) throw habitError
      const clientHabitIdByServerId = new Map((habitRows ?? []).map((row) => [row.id, row.client_habit_id]))
      return (entryRows ?? []).map((row) => mapHabitEntryRow(row, clientHabitIdByServerId))
    },
    async getWaterLogs() {
      const { data, error } = await client().from('water_logs').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapWaterLogRow)
    },
    async getWaterGoal() {
      const { data, error } = await client().from('water_goals').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? mapWaterGoalRow(data) : null
    },
    async saveHabit(habit: Habit) {
      const { error } = await client()
        .from('habits')
        .upsert(toHabitRow(userId, habit), { onConflict: 'user_id,client_habit_id' })
      if (error) throw error
    },
    async deleteHabit(clientHabitId: string) {
      const { error } = await client().from('habits').delete().eq('user_id', userId).eq('client_habit_id', clientHabitId)
      if (error) throw error
    },
    async saveEntry(entry: HabitEntry, habit: Habit) {
      // habit_entries.habit_id is a server-side FK — resolve it via an
      // upsert of the parent habit (idempotent even if already synced)
      // rather than assuming the caller pushed it first.
      const { data: habitRow, error: habitError } = await client()
        .from('habits')
        .upsert(toHabitRow(userId, habit), { onConflict: 'user_id,client_habit_id' })
        .select('id')
        .single()
      if (habitError) throw habitError

      const { error: entryError } = await client()
        .from('habit_entries')
        .upsert(toHabitEntryRow(userId, habitRow.id, entry), { onConflict: 'user_id,client_entry_id' })
      if (entryError) throw entryError
    },
    async deleteEntry(clientEntryId: string) {
      const { error } = await client()
        .from('habit_entries')
        .delete()
        .eq('user_id', userId)
        .eq('client_entry_id', clientEntryId)
      if (error) throw error
    },
    async saveWaterLog(log: WaterLog) {
      const { error } = await client()
        .from('water_logs')
        .upsert(toWaterLogRow(userId, log), { onConflict: 'user_id,client_log_id' })
      if (error) throw error
    },
    async deleteWaterLog(clientLogId: string) {
      const { error } = await client()
        .from('water_logs')
        .delete()
        .eq('user_id', userId)
        .eq('client_log_id', clientLogId)
      if (error) throw error
    },
    async saveWaterGoal(goal: WaterGoal) {
      const { error } = await client()
        .from('water_goals')
        .upsert(toWaterGoalRow(userId, goal), { onConflict: 'user_id' })
      if (error) throw error
    },
    async getHabitServerIdToClientId() {
      const { data, error } = await client().from('habits').select('id, client_habit_id').eq('user_id', userId)
      if (error) throw error
      return Object.fromEntries((data ?? []).map((row) => [row.id, row.client_habit_id]))
    },
    async getHabitEntryServerIds() {
      const { data, error } = await client().from('habit_entries').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
    async getWaterLogServerIds() {
      const { data, error } = await client().from('water_logs').select('id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((row) => row.id)
    },
  }
}

export function createCloudGamificationRepository(userId: string): GamificationRepository & GamificationRepositoryWriter {
  return {
    async getXpEvents() {
      const { data, error } = await client().from('xp_events').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapXpEventRow)
    },
    async getEarnedBadges() {
      const { data, error } = await client().from('earned_badges').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapEarnedBadgeRow)
    },
    async getCompletedChallengeIds() {
      const { data, error } = await client().from('challenge_completions').select('*').eq('user_id', userId)
      if (error) throw error
      return ((data ?? []) as ChallengeCompletionRow[]).map((row) => row.instance_id)
    },
    async ensureProfile(createdAt: string) {
      const { error } = await client()
        .from('gamification_profiles')
        .upsert({ user_id: userId, created_at: createdAt }, { onConflict: 'user_id', ignoreDuplicates: true })
      if (error) throw error
    },
    async saveXpEvents(events: XPEvent[]) {
      if (events.length === 0) return
      // `ignoreDuplicates` is the anti-farming guarantee: (user_id, event_id)
      // is the table's primary key, so a re-synced or re-derived event with
      // the same deterministic id can never be counted twice server-side.
      const { error } = await client()
        .from('xp_events')
        .upsert(
          events.map((event) => toXpEventRow(userId, event)),
          { onConflict: 'user_id,event_id', ignoreDuplicates: true },
        )
      if (error) throw error
    },
    async saveEarnedBadges(badges: EarnedBadge[]) {
      if (badges.length === 0) return
      const { error } = await client()
        .from('earned_badges')
        .upsert(
          badges.map((badge) => toEarnedBadgeRow(userId, badge)),
          { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
        )
      if (error) throw error
    },
    async saveCompletedChallenges(instanceIds: string[], completedAt: string) {
      if (instanceIds.length === 0) return
      const { error } = await client()
        .from('challenge_completions')
        .upsert(
          instanceIds.map((instanceId) => toChallengeCompletionRow(userId, instanceId, completedAt)),
          { onConflict: 'user_id,instance_id', ignoreDuplicates: true },
        )
      if (error) throw error
    },
  }
}

export function createCloudRepositories(userId: string): Repositories {
  return {
    workout: createCloudWorkoutRepository(userId),
    progress: createCloudProgressRepository(userId),
    nutrition: createCloudNutritionRepository(userId),
    habit: createCloudHabitRepository(userId),
    gamification: createCloudGamificationRepository(userId),
  }
}

/**
 * Settings > Data & Privacy > "Reset Fitness Data" (Part 3) predates cloud
 * sync (Part 5) and only ever cleared local state — now that a signed-in
 * user's data round-trips to Supabase, a local-only reset would be undone
 * by the very next sign-in pulling the old data back down. This clears
 * every user-owned row across all 17 domain tables (never `profiles`,
 * never the static exercise/program catalogue, which isn't user data at
 * all — it has no table at all).
 *
 * `workout_sessions` and `habits` cascade-delete their children
 * (`workout_exercises`/`workout_sets` and `habit_entries` respectively,
 * both `on delete cascade` — see migrations 2 and 5); the rest are deleted
 * directly since nothing else references them. These are the only 3
 * cross-table foreign keys in the whole schema, so there is no ordering
 * dependency among the 14 tables below — every delete is scoped only by
 * `user_id`, is independent of the others, and RLS's own `..._delete_own`
 * policy (`auth.uid() = user_id`, present on all 17 tables) enforces the
 * same ownership check server-side regardless of what this function is
 * called with, so a wrong or forged `userId` can delete zero rows, never
 * another user's. Every table is attempted even if one fails, so a single
 * transient error can't leave the rest of the reset half-done; any
 * failures are collected and thrown together once every table has been
 * tried.
 */
export async function deleteAllCloudUserData(userId: string): Promise<void> {
  const tables = [
    'workout_sessions',
    'personal_records',
    'weight_logs',
    'body_measurements',
    'weight_goals',
    'nutrition_goals',
    'food_entries',
    'habits',
    'water_goals',
    'water_logs',
    'gamification_profiles',
    'xp_events',
    'earned_badges',
    'challenge_completions',
  ] as const

  const results = await Promise.allSettled(
    tables.map(async (table) => {
      const { error } = await client().from(table).delete().eq('user_id', userId)
      if (error) throw new Error(`${table}: ${error.message}`)
    }),
  )

  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failures.length > 0) {
    throw new Error(`Failed to clear cloud data for ${failures.length} table(s): ${failures.map((f) => f.reason.message).join('; ')}`)
  }
}
