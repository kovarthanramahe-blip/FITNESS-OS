import { supabase } from '@/lib/supabase'
import type { ChallengeCompletionRow } from '@/types/supabase'
import type {
  GamificationRepository,
  HabitRepository,
  NutritionRepository,
  ProgressRepository,
  Repositories,
  WorkoutRepository,
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
} from '@/lib/repositories/cloud/mappers'

function client() {
  if (!supabase) {
    throw new Error('Cloud repositories require a configured Supabase client — check isSupabaseConfigured before creating them.')
  }
  return supabase
}

/**
 * Real Supabase-backed reads, one per domain, against the schema in
 * supabase/migrations/. These are wired up but not yet used by any page —
 * per Phase 7's local-first, no-risky-migration mandate, existing pages
 * keep reading from the local stores until Phase 8 introduces the actual
 * sync flow. `getRepositories()` (see ../index.ts) is where that switch
 * will happen.
 */

export function createCloudWorkoutRepository(userId: string): WorkoutRepository {
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
  }
}

export function createCloudProgressRepository(userId: string): ProgressRepository {
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
  }
}

export function createCloudNutritionRepository(userId: string): NutritionRepository {
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
  }
}

export function createCloudHabitRepository(userId: string): HabitRepository {
  return {
    async getHabits() {
      const { data, error } = await client().from('habits').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapHabitRow)
    },
    async getEntries() {
      const { data, error } = await client().from('habit_entries').select('*').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map(mapHabitEntryRow)
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
  }
}

export function createCloudGamificationRepository(userId: string): GamificationRepository {
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
