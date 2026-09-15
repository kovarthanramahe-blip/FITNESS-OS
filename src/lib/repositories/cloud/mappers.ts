import type { EarnedBadge, XPEvent, XPEventType } from '@/types/gamification'
import type { Habit, HabitEntry, HabitIconKey, HabitCategory, HabitSchedule, WaterGoal, WaterLog } from '@/types/habits'
import type { FoodEntry, MealType, NutritionGoal } from '@/types/nutrition'
import type { BodyMeasurement, MeasurementUnit, PersonalRecord, PersonalRecordType, WeightGoal, WeightLog } from '@/types/progress'
import type { Database } from '@/types/supabase'
import type { WorkoutHistoryEntry } from '@/types/workout'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export function mapWorkoutSessionRow(row: Row<'workout_sessions'>): WorkoutHistoryEntry {
  return {
    id: row.id,
    sessionId: row.client_session_id,
    date: row.completed_at ?? row.started_at,
    name: row.name,
    durationMinutes: row.duration_minutes,
    volumeKg: row.volume_kg,
    exerciseCount: row.exercise_count,
    setCount: row.set_count,
    personalRecordCount: row.personal_record_count,
    estimatedCalories: row.estimated_calories,
  }
}

export function mapPersonalRecordRow(row: Row<'personal_records'>): PersonalRecord {
  return {
    id: row.id,
    exercise: row.exercise,
    exerciseId: row.exercise_id ?? undefined,
    weightKg: row.weight_kg,
    reps: row.reps,
    date: row.record_date,
    type: (row.record_type as PersonalRecordType | null) ?? undefined,
    estimatedOneRepMax: row.estimated_one_rep_max ?? undefined,
  }
}

export function mapWeightLogRow(row: Row<'weight_logs'>): WeightLog {
  return {
    id: row.id,
    date: row.log_date,
    weightKg: row.weight_kg,
    note: row.note ?? undefined,
  }
}

export function mapWeightGoalRow(row: Row<'weight_goals'>): WeightGoal {
  return {
    startingWeightKg: row.starting_weight_kg,
    targetWeightKg: row.target_weight_kg,
    startDate: row.start_date,
  }
}

export function mapMeasurementRow(row: Row<'body_measurements'>): BodyMeasurement {
  return {
    id: row.id,
    type: row.measurement_type,
    date: row.log_date,
    value: row.value,
    unit: row.unit as MeasurementUnit,
    note: row.note ?? undefined,
  }
}

export function mapNutritionGoalRow(row: Row<'nutrition_goals'>): NutritionGoal {
  return {
    dailyCalories: row.daily_calories,
    proteinGrams: row.protein_grams,
    carbohydrateGrams: row.carbohydrate_grams,
    fatGrams: row.fat_grams,
    fiberGrams: row.fiber_grams ?? undefined,
  }
}

export function mapFoodEntryRow(row: Row<'food_entries'>): FoodEntry {
  return {
    id: row.id,
    foodId: row.food_id,
    foodName: row.food_name,
    meal: row.meal as MealType,
    quantity: row.quantity,
    servingUnit: row.serving_unit,
    calories: row.calories,
    protein: row.protein,
    carbohydrates: row.carbohydrates,
    fat: row.fat,
    fiber: row.fiber,
    date: row.log_date,
    createdAt: row.created_at,
  }
}

function mapHabitFrequency(row: Row<'habits'>): HabitSchedule {
  if (row.frequency_type === 'weekdays') {
    return { type: 'weekdays', days: row.frequency_days ?? [] }
  }
  if (row.frequency_type === 'weekly') {
    return { type: 'weekly', timesPerWeek: row.frequency_times_per_week ?? 1 }
  }
  return { type: 'daily' }
}

export function mapHabitRow(row: Row<'habits'>): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon as HabitIconKey,
    category: row.category as HabitCategory,
    frequency: mapHabitFrequency(row),
    target: row.target,
    unit: row.unit ?? undefined,
    reminderEnabled: row.reminder_enabled,
    reminderTime: row.reminder_time ?? undefined,
    active: row.active,
    createdAt: row.created_at,
  }
}

export function mapHabitEntryRow(row: Row<'habit_entries'>): HabitEntry {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.log_date,
    completedAt: row.completed_at,
  }
}

export function mapWaterGoalRow(row: Row<'water_goals'>): WaterGoal {
  return {
    goalMl: row.goal_ml,
    preferredUnit: row.preferred_unit as WaterGoal['preferredUnit'],
  }
}

export function mapWaterLogRow(row: Row<'water_logs'>): WaterLog {
  return {
    id: row.id,
    date: row.log_date,
    amountMl: row.amount_ml,
    createdAt: row.created_at,
  }
}

export function mapXpEventRow(row: Row<'xp_events'>): XPEvent {
  return {
    id: row.event_id,
    type: row.event_type as XPEventType,
    amount: row.amount,
    date: row.event_date,
    sourceId: row.source_id,
    description: row.description,
  }
}

export function mapEarnedBadgeRow(row: Row<'earned_badges'>): EarnedBadge {
  return {
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
  }
}
