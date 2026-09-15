/**
 * Hand-written to match supabase/migrations/*.sql exactly. If the schema
 * changes, update both together. (A real Supabase CLI install can
 * regenerate this file from the live project with
 * `supabase gen types typescript`, but that isn't available in this
 * environment.)
 *
 * Row types are defined standalone (not nested inside `Database`) and
 * Insert/Update are derived from those standalone types — referencing
 * `Database[...]` from within `Database`'s own definition confuses
 * TypeScript's inference through the Supabase client's generics.
 */

export interface ProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutSessionRow {
  id: string
  user_id: string
  client_session_id: string
  name: string
  level: string | null
  started_at: string
  completed_at: string | null
  duration_minutes: number
  volume_kg: number
  exercise_count: number
  set_count: number
  personal_record_count: number
  estimated_calories: number
  created_at: string
}

export interface WorkoutExerciseRow {
  id: string
  user_id: string
  session_id: string
  exercise_id: string
  name: string
  muscle_group: string | null
  target_reps: string | null
  rest_seconds: number | null
  position: number
}

export interface WorkoutSetRow {
  id: string
  user_id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  completed: boolean
  set_type: string | null
  rest_seconds: number | null
  notes: string | null
}

export interface PersonalRecordRow {
  id: string
  user_id: string
  client_record_id: string
  exercise: string
  exercise_id: string | null
  weight_kg: number
  reps: number
  record_date: string
  record_type: string | null
  estimated_one_rep_max: number | null
  created_at: string
}

export interface WeightLogRow {
  id: string
  user_id: string
  client_log_id: string
  log_date: string
  weight_kg: number
  note: string | null
  created_at: string
}

export interface BodyMeasurementRow {
  id: string
  user_id: string
  client_measurement_id: string
  measurement_type: string
  log_date: string
  value: number
  unit: string
  note: string | null
  created_at: string
}

export interface WeightGoalRow {
  user_id: string
  starting_weight_kg: number
  target_weight_kg: number
  start_date: string
  updated_at: string
}

export interface NutritionGoalRow {
  user_id: string
  daily_calories: number
  protein_grams: number
  carbohydrate_grams: number
  fat_grams: number
  fiber_grams: number | null
  updated_at: string
}

export interface FoodEntryRow {
  id: string
  user_id: string
  client_entry_id: string
  food_id: string
  food_name: string
  meal: string
  quantity: number
  serving_unit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  log_date: string
  created_at: string
}

export interface HabitRow {
  id: string
  user_id: string
  client_habit_id: string
  name: string
  description: string | null
  icon: string
  category: string
  frequency_type: string
  frequency_days: number[] | null
  frequency_times_per_week: number | null
  target: number
  unit: string | null
  reminder_enabled: boolean
  reminder_time: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface HabitEntryRow {
  id: string
  user_id: string
  habit_id: string
  client_entry_id: string
  log_date: string
  completed_at: string
}

export interface WaterGoalRow {
  user_id: string
  goal_ml: number
  preferred_unit: string
  updated_at: string
}

export interface WaterLogRow {
  id: string
  user_id: string
  client_log_id: string
  log_date: string
  amount_ml: number
  created_at: string
}

export interface GamificationProfileRow {
  user_id: string
  created_at: string
}

export interface XpEventRow {
  user_id: string
  event_id: string
  event_type: string
  amount: number
  event_date: string
  source_id: string
  description: string
  created_at: string
}

export interface EarnedBadgeRow {
  user_id: string
  badge_id: string
  earned_at: string
}

export interface ChallengeCompletionRow {
  user_id: string
  instance_id: string
  completed_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Pick<ProfileRow, 'id'> & Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
      }
      workout_sessions: {
        Row: WorkoutSessionRow
        Insert: Omit<WorkoutSessionRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<WorkoutSessionRow, 'id' | 'created_at'>>
      }
      workout_exercises: {
        Row: WorkoutExerciseRow
        Insert: Omit<WorkoutExerciseRow, 'id'> & { id?: string }
        Update: Partial<Omit<WorkoutExerciseRow, 'id'>>
      }
      workout_sets: {
        Row: WorkoutSetRow
        Insert: Omit<WorkoutSetRow, 'id'> & { id?: string }
        Update: Partial<Omit<WorkoutSetRow, 'id'>>
      }
      personal_records: {
        Row: PersonalRecordRow
        Insert: Omit<PersonalRecordRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<PersonalRecordRow, 'id' | 'created_at'>>
      }
      weight_logs: {
        Row: WeightLogRow
        Insert: Omit<WeightLogRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<WeightLogRow, 'id' | 'created_at'>>
      }
      body_measurements: {
        Row: BodyMeasurementRow
        Insert: Omit<BodyMeasurementRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<BodyMeasurementRow, 'id' | 'created_at'>>
      }
      weight_goals: {
        Row: WeightGoalRow
        Insert: Omit<WeightGoalRow, 'updated_at'>
        Update: Partial<Omit<WeightGoalRow, 'user_id' | 'updated_at'>>
      }
      nutrition_goals: {
        Row: NutritionGoalRow
        Insert: Omit<NutritionGoalRow, 'updated_at'>
        Update: Partial<Omit<NutritionGoalRow, 'user_id' | 'updated_at'>>
      }
      food_entries: {
        Row: FoodEntryRow
        Insert: Omit<FoodEntryRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<FoodEntryRow, 'id' | 'created_at'>>
      }
      habits: {
        Row: HabitRow
        Insert: Omit<HabitRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<HabitRow, 'id' | 'created_at' | 'updated_at'>>
      }
      habit_entries: {
        Row: HabitEntryRow
        Insert: Omit<HabitEntryRow, 'id' | 'completed_at'> & { id?: string; completed_at?: string }
        Update: Partial<Omit<HabitEntryRow, 'id'>>
      }
      water_goals: {
        Row: WaterGoalRow
        Insert: Omit<WaterGoalRow, 'updated_at'>
        Update: Partial<Omit<WaterGoalRow, 'user_id' | 'updated_at'>>
      }
      water_logs: {
        Row: WaterLogRow
        Insert: Omit<WaterLogRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<WaterLogRow, 'id' | 'created_at'>>
      }
      gamification_profiles: {
        Row: GamificationProfileRow
        Insert: GamificationProfileRow
        Update: Partial<Omit<GamificationProfileRow, 'user_id'>>
      }
      xp_events: {
        Row: XpEventRow
        Insert: Omit<XpEventRow, 'created_at'>
        Update: Partial<Omit<XpEventRow, 'user_id' | 'event_id' | 'created_at'>>
      }
      earned_badges: {
        Row: EarnedBadgeRow
        Insert: Omit<EarnedBadgeRow, 'earned_at'> & { earned_at?: string }
        Update: Partial<Omit<EarnedBadgeRow, 'user_id' | 'badge_id'>>
      }
      challenge_completions: {
        Row: ChallengeCompletionRow
        Insert: Omit<ChallengeCompletionRow, 'completed_at'> & { completed_at?: string }
        Update: Partial<Omit<ChallengeCompletionRow, 'user_id' | 'instance_id'>>
      }
    }
  }
}
