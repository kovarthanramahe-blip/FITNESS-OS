import { beforeEach, describe, expect, it } from 'vitest'
import { getGamificationState, getGamificationStats, resetGamificationStoreForTests, syncGamification } from './gamificationStore'
import { addWaterLog, completeHabit, getHabitState, resetHabitStoreForTests } from './habitStore'
import { addFoodEntry, getNutritionState, resetNutritionStoreForTests } from './nutritionStore'
import { addWeightLog, getProgressState, resetProgressStoreForTests } from './progressStore'
import { getWorkoutState, resetWorkoutStoreForTests } from './workoutStore'

beforeEach(() => {
  resetWorkoutStoreForTests()
  resetProgressStoreForTests()
  resetNutritionStoreForTests()
  resetHabitStoreForTests()
  resetGamificationStoreForTests()
})

describe('syncGamification — reads from the existing domain stores', () => {
  it('awards XP for the seeded workout history and its personal records', () => {
    const result = syncGamification()
    expect(result.newXpEvents.some((event) => event.type === 'workout_session_complete')).toBe(true)
    expect(result.newXpEvents.some((event) => event.type === 'personal_record')).toBe(true)
    expect(getGamificationState().xpEvents.length).toBeGreaterThan(0)
  })

  it('is idempotent: a second sync against unchanged data adds nothing new', () => {
    syncGamification()
    const countAfterFirst = getGamificationState().xpEvents.length

    const second = syncGamification()
    expect(second.newXpEvents).toHaveLength(0)
    expect(second.newBadges).toHaveLength(0)
    expect(getGamificationState().xpEvents).toHaveLength(countAfterFirst)
  })

  it('awards XP when a weight entry is logged', () => {
    syncGamification()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const result = syncGamification()
    expect(result.newXpEvents.some((event) => event.type === 'weight_log')).toBe(true)
  })

  it('awards XP when food is logged', () => {
    syncGamification()
    addFoodEntry({
      foodId: 'food-1',
      foodName: 'Chicken Breast',
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
    const result = syncGamification()
    expect(result.newXpEvents.some((event) => event.type === 'nutrition_log')).toBe(true)
  })

  it('awards XP when a habit is completed', () => {
    syncGamification()
    const habit = getHabitState().habits[0]!
    completeHabit(habit.id, '2024-06-01')
    const result = syncGamification()
    expect(result.newXpEvents.some((event) => event.type === 'habit_complete')).toBe(true)
  })

  it('awards XP when the daily water goal is reached', () => {
    syncGamification()
    const goalMl = getHabitState().waterGoal.goalMl
    addWaterLog(goalMl, '2024-06-01')
    const result = syncGamification()
    expect(result.newXpEvents.some((event) => event.type === 'water_goal_reached')).toBe(true)
  })

  it('never awards the same underlying action twice across repeated syncs', () => {
    addWeightLog({ date: '2024-06-05', weightKg: 79 })
    syncGamification()
    const countAfterFirst = getGamificationState().xpEvents.filter((event) => event.type === 'weight_log').length

    syncGamification()
    syncGamification()
    const countAfterMore = getGamificationState().xpEvents.filter((event) => event.type === 'weight_log').length
    expect(countAfterMore).toBe(countAfterFirst)
  })

  it('never mutates the source stores it reads from', () => {
    const workoutBefore = getWorkoutState()
    const progressBefore = getProgressState()
    const nutritionBefore = getNutritionState()
    const habitBefore = getHabitState()

    syncGamification()

    expect(getWorkoutState()).toBe(workoutBefore)
    expect(getProgressState()).toBe(progressBefore)
    expect(getNutritionState()).toBe(nutritionBefore)
    expect(getHabitState()).toBe(habitBefore)
  })

  it('increases total XP as more qualifying actions accumulate', () => {
    syncGamification()
    const xpBefore = getGamificationStats().profile.totalXp

    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    syncGamification()
    const xpAfter = getGamificationStats().profile.totalXp

    expect(xpAfter).toBeGreaterThan(xpBefore)
  })
})

describe('getGamificationStats', () => {
  it('produces a complete, well-formed read model', () => {
    syncGamification()
    const stats = getGamificationStats()

    expect(stats.profile.currentLevel).toBeGreaterThanOrEqual(1)
    expect(stats.streaks).toHaveLength(3)
    expect(Array.isArray(stats.earnedBadges)).toBe(true)
    expect(Array.isArray(stats.lockedBadges)).toBe(true)
    expect(stats.earnedBadges.length + stats.lockedBadges.length).toBeGreaterThan(0)
  })
})
