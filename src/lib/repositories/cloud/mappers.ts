import type { EarnedBadge, XPEvent, XPEventType } from '@/types/gamification'
import type { Habit, HabitEntry, HabitIconKey, HabitCategory, HabitSchedule, WaterGoal, WaterLog } from '@/types/habits'
import type { FoodEntry, MealType, NutritionGoal } from '@/types/nutrition'
import type { BodyMeasurement, MeasurementUnit, PersonalRecord, PersonalRecordType, WeightGoal, WeightLog } from '@/types/progress'
import type { Database } from '@/types/supabase'
import type { WorkoutExercise, WorkoutHistoryEntry, WorkoutSession, WorkoutSet } from '@/types/workout'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

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

// ---------------------------------------------------------------------------
// Local -> Row (write side, Part 5). `client_*_id` is always the id the
// local store already generated — never a server-side identity decision —
// so every upsert below is idempotent by construction, matching the
// `unique(user_id, client_*_id)` constraints in the migrations.
// ---------------------------------------------------------------------------

export function toWeightLogRow(userId: string, log: WeightLog): Insert<'weight_logs'> {
  return { user_id: userId, client_log_id: log.id, log_date: log.date, weight_kg: log.weightKg, note: log.note ?? null }
}

export function toWeightGoalRow(userId: string, goal: WeightGoal): Insert<'weight_goals'> {
  return {
    user_id: userId,
    starting_weight_kg: goal.startingWeightKg,
    target_weight_kg: goal.targetWeightKg,
    start_date: goal.startDate,
  }
}

export function toMeasurementRow(userId: string, measurement: BodyMeasurement): Insert<'body_measurements'> {
  return {
    user_id: userId,
    client_measurement_id: measurement.id,
    measurement_type: measurement.type,
    log_date: measurement.date,
    value: measurement.value,
    unit: measurement.unit,
    note: measurement.note ?? null,
  }
}

export function toNutritionGoalRow(userId: string, goal: NutritionGoal): Insert<'nutrition_goals'> {
  return {
    user_id: userId,
    daily_calories: goal.dailyCalories,
    protein_grams: goal.proteinGrams,
    carbohydrate_grams: goal.carbohydrateGrams,
    fat_grams: goal.fatGrams,
    fiber_grams: goal.fiberGrams ?? null,
  }
}

export function toFoodEntryRow(userId: string, entry: FoodEntry): Insert<'food_entries'> {
  return {
    user_id: userId,
    client_entry_id: entry.id,
    food_id: entry.foodId,
    food_name: entry.foodName,
    meal: entry.meal,
    quantity: entry.quantity,
    serving_unit: entry.servingUnit,
    calories: entry.calories,
    protein: entry.protein,
    carbohydrates: entry.carbohydrates,
    fat: entry.fat,
    fiber: entry.fiber,
    log_date: entry.date,
  }
}

function habitFrequencyColumns(
  frequency: HabitSchedule,
): Pick<Insert<'habits'>, 'frequency_type' | 'frequency_days' | 'frequency_times_per_week'> {
  if (frequency.type === 'weekdays') {
    return { frequency_type: 'weekdays', frequency_days: frequency.days, frequency_times_per_week: null }
  }
  if (frequency.type === 'weekly') {
    return { frequency_type: 'weekly', frequency_days: null, frequency_times_per_week: frequency.timesPerWeek }
  }
  return { frequency_type: 'daily', frequency_days: null, frequency_times_per_week: null }
}

export function toHabitRow(userId: string, habit: Habit): Insert<'habits'> {
  return {
    user_id: userId,
    client_habit_id: habit.id,
    name: habit.name,
    description: habit.description ?? null,
    icon: habit.icon,
    category: habit.category,
    ...habitFrequencyColumns(habit.frequency),
    target: habit.target,
    unit: habit.unit ?? null,
    reminder_enabled: habit.reminderEnabled,
    reminder_time: habit.reminderTime ?? null,
    active: habit.active,
  }
}

export function toHabitEntryRow(userId: string, habitServerId: string, entry: HabitEntry): Insert<'habit_entries'> {
  return {
    user_id: userId,
    habit_id: habitServerId,
    client_entry_id: entry.id,
    log_date: entry.date,
    completed_at: entry.completedAt,
  }
}

export function toWaterGoalRow(userId: string, goal: WaterGoal): Insert<'water_goals'> {
  return { user_id: userId, goal_ml: goal.goalMl, preferred_unit: goal.preferredUnit }
}

export function toWaterLogRow(userId: string, log: WaterLog): Insert<'water_logs'> {
  return { user_id: userId, client_log_id: log.id, log_date: log.date, amount_ml: log.amountMl }
}

export function toPersonalRecordRow(userId: string, record: PersonalRecord): Insert<'personal_records'> {
  return {
    user_id: userId,
    client_record_id: record.id,
    exercise: record.exercise,
    exercise_id: record.exerciseId ?? null,
    weight_kg: record.weightKg,
    reps: record.reps,
    record_date: record.date,
    record_type: record.type ?? null,
    estimated_one_rep_max: record.estimatedOneRepMax ?? null,
  }
}

export function toWorkoutSessionRow(
  userId: string,
  session: WorkoutSession,
  historyEntry: WorkoutHistoryEntry,
): Insert<'workout_sessions'> {
  return {
    user_id: userId,
    client_session_id: session.id,
    name: session.name,
    level: session.level,
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
    duration_minutes: historyEntry.durationMinutes,
    volume_kg: historyEntry.volumeKg,
    exercise_count: historyEntry.exerciseCount,
    set_count: historyEntry.setCount,
    personal_record_count: historyEntry.personalRecordCount,
    estimated_calories: historyEntry.estimatedCalories,
  }
}

export function toWorkoutExerciseRow(
  userId: string,
  sessionServerId: string,
  exercise: WorkoutExercise,
  position: number,
): Insert<'workout_exercises'> {
  return {
    user_id: userId,
    session_id: sessionServerId,
    exercise_id: exercise.exerciseId,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    target_reps: exercise.targetReps,
    rest_seconds: exercise.restSeconds,
    position,
  }
}

export function toWorkoutSetRow(userId: string, exerciseServerId: string, set: WorkoutSet): Insert<'workout_sets'> {
  return {
    user_id: userId,
    exercise_id: exerciseServerId,
    set_number: set.setNumber,
    weight_kg: set.weightKg,
    reps: set.reps,
    completed: set.completed,
    set_type: set.setType ?? null,
    rest_seconds: set.restSeconds ?? null,
    notes: set.notes ?? null,
  }
}

export function toXpEventRow(userId: string, event: XPEvent): Insert<'xp_events'> {
  return {
    user_id: userId,
    event_id: event.id,
    event_type: event.type,
    amount: event.amount,
    event_date: event.date,
    source_id: event.sourceId,
    description: event.description,
  }
}

export function toEarnedBadgeRow(userId: string, badge: EarnedBadge): Insert<'earned_badges'> {
  return { user_id: userId, badge_id: badge.badgeId, earned_at: badge.earnedAt }
}

export function toChallengeCompletionRow(userId: string, instanceId: string, completedAt: string): Insert<'challenge_completions'> {
  return { user_id: userId, instance_id: instanceId, completed_at: completedAt }
}
