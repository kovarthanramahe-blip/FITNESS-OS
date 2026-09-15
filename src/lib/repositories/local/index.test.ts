import { beforeEach, describe, expect, it } from 'vitest'
import {
  localGamificationRepository,
  localHabitRepository,
  localNutritionRepository,
  localProgressRepository,
  localRepositories,
  localWorkoutRepository,
} from './index'
import { addWaterLog, completeHabit, getHabitState, resetHabitStoreForTests } from '@/lib/habitStore'
import { addFoodEntry, getNutritionState, resetNutritionStoreForTests } from '@/lib/nutritionStore'
import { addWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
import { getWorkoutState, resetWorkoutStoreForTests } from '@/lib/workoutStore'
import { resetGamificationStoreForTests, syncGamification, getGamificationState } from '@/lib/gamificationStore'

beforeEach(() => {
  resetWorkoutStoreForTests()
  resetProgressStoreForTests()
  resetNutritionStoreForTests()
  resetHabitStoreForTests()
  resetGamificationStoreForTests()
})

describe('local repositories — read exactly what the existing stores hold', () => {
  it('workout repository mirrors workoutStore', async () => {
    const state = getWorkoutState()
    await expect(localWorkoutRepository.getHistory()).resolves.toEqual(state.history)
    await expect(localWorkoutRepository.getPersonalRecords()).resolves.toEqual(state.personalRecords)
  })

  it('progress repository mirrors progressStore, including newly added data', async () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const state = getProgressState()

    await expect(localProgressRepository.getWeightLogs()).resolves.toEqual(state.weightLogs)
    await expect(localProgressRepository.getWeightGoal()).resolves.toEqual(state.weightGoal)
    await expect(localProgressRepository.getMeasurements()).resolves.toEqual(state.measurements)
  })

  it('nutrition repository mirrors nutritionStore', async () => {
    addFoodEntry({
      foodId: 'f1',
      foodName: 'Chicken',
      meal: 'lunch',
      quantity: 1,
      servingUnit: 'serving',
      calories: 300,
      protein: 30,
      carbohydrates: 5,
      fat: 10,
      fiber: 2,
      date: '2024-06-01',
    })
    const state = getNutritionState()

    await expect(localNutritionRepository.getFoodEntries()).resolves.toEqual(state.entries)
    await expect(localNutritionRepository.getGoal()).resolves.toEqual(state.goal)
  })

  it('habit repository mirrors habitStore', async () => {
    const habit = getHabitState().habits[0]!
    completeHabit(habit.id, '2024-06-01')
    addWaterLog(250, '2024-06-01')
    const state = getHabitState()

    await expect(localHabitRepository.getHabits()).resolves.toEqual(state.habits)
    await expect(localHabitRepository.getEntries()).resolves.toEqual(state.entries)
    await expect(localHabitRepository.getWaterLogs()).resolves.toEqual(state.waterLogs)
    await expect(localHabitRepository.getWaterGoal()).resolves.toEqual(state.waterGoal)
  })

  it('gamification repository mirrors gamificationStore', async () => {
    syncGamification()
    const state = getGamificationState()

    await expect(localGamificationRepository.getXpEvents()).resolves.toEqual(state.xpEvents)
    await expect(localGamificationRepository.getEarnedBadges()).resolves.toEqual(state.earnedBadges)
    await expect(localGamificationRepository.getCompletedChallengeIds()).resolves.toEqual(state.completedChallengeIds)
  })

  it('exposes all 5 domains from the localRepositories bundle', () => {
    expect(localRepositories.workout).toBe(localWorkoutRepository)
    expect(localRepositories.progress).toBe(localProgressRepository)
    expect(localRepositories.nutrition).toBe(localNutritionRepository)
    expect(localRepositories.habit).toBe(localHabitRepository)
    expect(localRepositories.gamification).toBe(localGamificationRepository)
  })
})
