import type { LucideIcon } from 'lucide-react'

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

export interface NutrientSummary {
  label: string
  unit: string
  consumed: number
  target: number
}

export interface WaterSummary {
  consumedMl: number
  targetMl: number
}

export interface StepsSummary {
  steps: number
  target: number
}

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

export interface StreakSummary {
  days: number
}

export interface LevelSummary {
  level: number
  xp: number
  xpToNextLevel: number
}

export interface DashboardHabit {
  id: string
  label: string
  icon: LucideIcon
  completed: boolean
}

export interface DashboardData {
  header: DashboardHeaderData
  dailyScore: DailyScoreData
  calories: NutrientSummary
  protein: NutrientSummary
  water: WaterSummary
  steps: StepsSummary
  weight: WeightSummary
  streak: StreakSummary
  level: LevelSummary
  habits: DashboardHabit[]
  weeklyActivity: WeekActivityDay[]
}
