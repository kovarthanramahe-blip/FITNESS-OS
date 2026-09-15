import type { EarnedBadge, XPEvent } from '@/types/gamification'
import type { Habit, HabitEntry, WaterGoal, WaterLog } from '@/types/habits'
import type { FoodEntry, NutritionGoal } from '@/types/nutrition'
import type { BodyMeasurement, PersonalRecord, WeightGoal, WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry } from '@/types/workout'

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
}

export interface HabitRepository {
  getHabits(): Promise<Habit[]>
  getEntries(): Promise<HabitEntry[]>
  getWaterLogs(): Promise<WaterLog[]>
  getWaterGoal(): Promise<WaterGoal | null>
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
