import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
import { addFoodEntry, getNutritionState, resetNutritionStoreForTests } from '@/lib/nutritionStore'
import { addHabit, getHabitState, resetHabitStoreForTests } from '@/lib/habitStore'
import { getGamificationState, resetGamificationStoreForTests, syncGamification } from '@/lib/gamificationStore'
import { completeSession, getWorkoutState, resetWorkoutStoreForTests, startSession } from '@/lib/workoutStore'
import { resetAllFitnessData } from './resetFitnessData'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import type { Workout } from '@/types/workout'

const sampleWorkout: Workout = {
  id: 'reset-test-workout',
  name: 'Reset Test Day',
  exercises: [{ exerciseId: 'bench-press', sets: 3, reps: '6-10' }],
  estimatedMinutes: 20,
}

beforeEach(() => {
  setCurrentUserId('user-reset-test')
  resetWorkoutStoreForTests()
  resetProgressStoreForTests()
  resetNutritionStoreForTests()
  resetHabitStoreForTests()
  resetGamificationStoreForTests()
})

afterEach(() => {
  resetStorageScopeForTests()
})

describe('resetAllFitnessData', () => {
  it('clears user-generated records across every domain store', () => {
    startSession(sampleWorkout, 'Beginner')
    completeSession()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    addFoodEntry({
      foodId: 'food-eggs',
      foodName: 'Eggs',
      meal: 'breakfast',
      quantity: 1,
      servingUnit: 'large eggs',
      calories: 78,
      protein: 6,
      carbohydrates: 0.6,
      fat: 5,
      fiber: 0,
      date: '2024-06-01',
    })
    addHabit({
      name: 'Drink water',
      icon: 'droplets',
      category: 'hydration',
      frequency: { type: 'daily' },
      target: 1,
      reminderEnabled: false,
      active: true,
    })
    syncGamification(new Date('2024-06-01'))

    expect(getWorkoutState().history.length).toBeGreaterThan(0)
    expect(getProgressState().weightLogs.length).toBeGreaterThan(0)
    expect(getNutritionState().entries.length).toBeGreaterThan(0)
    expect(getHabitState().habits.length).toBeGreaterThan(0)

    resetAllFitnessData()

    expect(getWorkoutState().history).toEqual([])
    expect(getWorkoutState().personalRecords).toEqual([])
    expect(getProgressState().weightLogs).toEqual([])
    expect(getProgressState().measurements).toEqual([])
    expect(getNutritionState().entries).toEqual([])
    expect(getHabitState().habits).toEqual([])
    expect(getHabitState().entries).toEqual([])
    expect(getHabitState().waterLogs).toEqual([])
    expect(getGamificationState().xpEvents).toEqual([])
    expect(getGamificationState().earnedBadges).toEqual([])
    expect(getGamificationState().completedChallengeIds).toEqual([])
  })
})
