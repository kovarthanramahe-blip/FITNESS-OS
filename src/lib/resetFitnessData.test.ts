import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  it('clears user-generated records across every domain store', async () => {
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

    await resetAllFitnessData()

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

describe('resetAllFitnessData + cloud', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('clears cloud data for the signed-in user before resetting locally', async () => {
    const deleteAllCloudUserData = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }))
    vi.doMock('@/lib/repositories/cloud', () => ({ deleteAllCloudUserData }))

    const { setCurrentUserId: setUserId } = await import('./storageScope')
    const { resetAllFitnessData: resetWithMockedCloud } = await import('./resetFitnessData')
    const { resetWorkoutStoreForTests: resetWorkout, getWorkoutState: getWorkout } = await import('./workoutStore')
    setUserId('user-cloud-reset')
    resetWorkout()

    await resetWithMockedCloud()

    expect(deleteAllCloudUserData).toHaveBeenCalledWith('user-cloud-reset')
    expect(getWorkout().history).toEqual([])
  })

  it('still resets local data even if the cloud deletion fails', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }))
    vi.doMock('@/lib/repositories/cloud', () => ({
      deleteAllCloudUserData: vi.fn().mockRejectedValue(new Error('network down')),
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { setCurrentUserId: setUserId } = await import('./storageScope')
    const { resetAllFitnessData: resetWithFailingCloud } = await import('./resetFitnessData')
    const { addWeightLog, getProgressState: getProgress, resetProgressStoreForTests: resetProgress } = await import(
      './progressStore'
    )
    setUserId('user-cloud-reset-failure')
    resetProgress()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })

    await resetWithFailingCloud()

    expect(getProgress().weightLogs).toEqual([])
  })

  it('never calls the cloud when signed out', async () => {
    const deleteAllCloudUserData = vi.fn()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }))
    vi.doMock('@/lib/repositories/cloud', () => ({ deleteAllCloudUserData }))

    const { resetAllFitnessData: resetSignedOut } = await import('./resetFitnessData')
    await resetSignedOut()

    expect(deleteAllCloudUserData).not.toHaveBeenCalled()
  })
})
