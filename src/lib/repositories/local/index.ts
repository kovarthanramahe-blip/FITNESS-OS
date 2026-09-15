import { getGamificationState } from '@/lib/gamificationStore'
import { getHabitState } from '@/lib/habitStore'
import { getNutritionState } from '@/lib/nutritionStore'
import { getProgressState } from '@/lib/progressStore'
import { getWorkoutState } from '@/lib/workoutStore'
import type {
  GamificationRepository,
  HabitRepository,
  NutritionRepository,
  ProgressRepository,
  Repositories,
  WorkoutRepository,
} from '@/lib/repositories/types'

/**
 * Thin adapters over the existing stores' own getters — no new state, no
 * new persistence, just the read shape the Repositories interface expects.
 * This is what every page already gets today (implicitly, via the store
 * hooks); wrapping it here just makes the same reads swappable for a
 * cloud-backed implementation later.
 */

export const localWorkoutRepository: WorkoutRepository = {
  async getHistory() {
    return getWorkoutState().history
  },
  async getPersonalRecords() {
    return getWorkoutState().personalRecords
  },
}

export const localProgressRepository: ProgressRepository = {
  async getWeightLogs() {
    return getProgressState().weightLogs
  },
  async getWeightGoal() {
    return getProgressState().weightGoal
  },
  async getMeasurements() {
    return getProgressState().measurements
  },
}

export const localNutritionRepository: NutritionRepository = {
  async getFoodEntries() {
    return getNutritionState().entries
  },
  async getGoal() {
    return getNutritionState().goal
  },
}

export const localHabitRepository: HabitRepository = {
  async getHabits() {
    return getHabitState().habits
  },
  async getEntries() {
    return getHabitState().entries
  },
  async getWaterLogs() {
    return getHabitState().waterLogs
  },
  async getWaterGoal() {
    return getHabitState().waterGoal
  },
}

export const localGamificationRepository: GamificationRepository = {
  async getXpEvents() {
    return getGamificationState().xpEvents
  },
  async getEarnedBadges() {
    return getGamificationState().earnedBadges
  },
  async getCompletedChallengeIds() {
    return getGamificationState().completedChallengeIds
  },
}

export const localRepositories: Repositories = {
  workout: localWorkoutRepository,
  progress: localProgressRepository,
  nutrition: localNutritionRepository,
  habit: localHabitRepository,
  gamification: localGamificationRepository,
}
