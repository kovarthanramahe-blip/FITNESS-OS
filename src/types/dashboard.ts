export type DayActivityStatus = 'complete' | 'rest' | 'missed' | 'upcoming'

export interface DashboardHeaderData {
  /** Short display name, e.g. shown in the greeting. */
  name: string
  /** Full name, used for avatar initials. */
  fullName: string
  avatarUrl?: string
}

export interface DailyScoreData {
  score: number
  max: number
}

/**
 * Compact summary of "today's workout" shown on the dashboard. Computed live
 * from the workout store (see src/lib/workoutStore.ts) rather than stored
 * here, since it reflects real session state.
 */
export interface WorkoutSummaryData {
  id: string
  name: string
  muscleGroups: string[]
  totalExercises: number
  completedExercises: number
  durationMinutes: number
}

/**
 * Compact calorie/protein summary shown on the dashboard. Computed live
 * from the nutrition store (see src/lib/nutritionStore.ts) rather than
 * stored here, since it reflects real logged food entries.
 */
export interface NutrientSummary {
  label: string
  unit: string
  consumed: number
  target: number
}

export interface StepsSummary {
  steps: number
  target: number
}

/**
 * Compact "current weight" summary shown on the dashboard. Computed live
 * from the progress store (see src/lib/progressStore.ts) rather than stored
 * here, since it reflects real weight-log entries.
 */
export interface WeightSummary {
  currentKg: number
  changeKg: number
  changePeriodLabel: string
  targetKg: number
  /** Recent values, oldest to newest, for a compact sparkline. */
  trend: number[]
}

export interface WeekActivityDay {
  day: string
  status: DayActivityStatus
  workoutMinutes: number
  /** Rough estimate only — not a medical or metabolic measurement. */
  caloriesBurned: number
}

export interface DashboardData {
  header: DashboardHeaderData
  dailyScore: DailyScoreData
  steps: StepsSummary
  weeklyActivity: WeekActivityDay[]
}
