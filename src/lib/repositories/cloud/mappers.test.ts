import { describe, expect, it } from 'vitest'
import {
  mapEarnedBadgeRow,
  mapFoodEntryRow,
  mapHabitEntryRow,
  mapHabitRow,
  mapMeasurementRow,
  mapNutritionGoalRow,
  mapPersonalRecordRow,
  mapWaterGoalRow,
  mapWaterLogRow,
  mapWeightGoalRow,
  mapWeightLogRow,
  mapWorkoutSessionRow,
  mapXpEventRow,
} from './mappers'

describe('cloud row mappers', () => {
  it('maps a workout session row, preferring completed_at for date', () => {
    const entry = mapWorkoutSessionRow({
      id: 'row-1',
      user_id: 'u1',
      client_session_id: 'session-1',
      name: 'Push A',
      level: 'Intermediate',
      started_at: '2024-06-01T18:00:00.000Z',
      completed_at: '2024-06-01T18:50:00.000Z',
      duration_minutes: 50,
      volume_kg: 1200,
      exercise_count: 5,
      set_count: 15,
      personal_record_count: 1,
      estimated_calories: 400,
      created_at: '2024-06-01T18:50:01.000Z',
    })
    expect(entry).toMatchObject({ id: 'row-1', sessionId: 'session-1', date: '2024-06-01T18:50:00.000Z', name: 'Push A' })
  })

  it('falls back to started_at when a session is not yet completed', () => {
    const entry = mapWorkoutSessionRow({
      id: 'row-1',
      user_id: 'u1',
      client_session_id: 'session-1',
      name: 'Push A',
      level: null,
      started_at: '2024-06-01T18:00:00.000Z',
      completed_at: null,
      duration_minutes: 0,
      volume_kg: 0,
      exercise_count: 0,
      set_count: 0,
      personal_record_count: 0,
      estimated_calories: 0,
      created_at: '2024-06-01T18:00:00.000Z',
    })
    expect(entry.date).toBe('2024-06-01T18:00:00.000Z')
  })

  it('maps a personal record row, treating nulls as undefined', () => {
    const record = mapPersonalRecordRow({
      id: 'pr-1',
      user_id: 'u1',
      client_record_id: 'pr-local-1',
      exercise: 'Squat',
      exercise_id: 'squat',
      weight_kg: 100,
      reps: 5,
      record_date: '2024-06-01T00:00:00.000Z',
      record_type: 'heaviestWeight',
      estimated_one_rep_max: null,
      created_at: '2024-06-01T00:00:00.000Z',
    })
    expect(record.estimatedOneRepMax).toBeUndefined()
    expect(record.type).toBe('heaviestWeight')
  })

  it('maps weight log, weight goal and measurement rows', () => {
    expect(mapWeightLogRow({ id: 'w1', user_id: 'u1', client_log_id: 'c1', log_date: '2024-06-01', weight_kg: 80, note: null, created_at: '' })).toEqual({
      id: 'w1',
      date: '2024-06-01',
      weightKg: 80,
      note: undefined,
    })

    expect(
      mapWeightGoalRow({ user_id: 'u1', starting_weight_kg: 85, target_weight_kg: 75, start_date: '2024-01-01', updated_at: '' }),
    ).toEqual({ startingWeightKg: 85, targetWeightKg: 75, startDate: '2024-01-01' })

    expect(
      mapMeasurementRow({
        id: 'm1',
        user_id: 'u1',
        client_measurement_id: 'c1',
        measurement_type: 'Waist',
        log_date: '2024-06-01',
        value: 80,
        unit: 'cm',
        note: null,
        created_at: '',
      }),
    ).toEqual({ id: 'm1', type: 'Waist', date: '2024-06-01', value: 80, unit: 'cm', note: undefined })
  })

  it('maps nutrition goal and food entry rows', () => {
    expect(
      mapNutritionGoalRow({
        user_id: 'u1',
        daily_calories: 2200,
        protein_grams: 150,
        carbohydrate_grams: 220,
        fat_grams: 70,
        fiber_grams: 30,
        updated_at: '',
      }),
    ).toEqual({ dailyCalories: 2200, proteinGrams: 150, carbohydrateGrams: 220, fatGrams: 70, fiberGrams: 30 })

    expect(
      mapFoodEntryRow({
        id: 'f1',
        user_id: 'u1',
        client_entry_id: 'c1',
        food_id: 'food-1',
        food_name: 'Oats',
        meal: 'breakfast',
        quantity: 1,
        serving_unit: 'bowl',
        calories: 300,
        protein: 10,
        carbohydrates: 40,
        fat: 5,
        fiber: 4,
        log_date: '2024-06-01',
        created_at: '2024-06-01T08:00:00.000Z',
      }),
    ).toMatchObject({ id: 'f1', foodName: 'Oats', meal: 'breakfast', date: '2024-06-01' })
  })

  it('maps habit rows, reconstructing each frequency type', () => {
    const base = {
      id: 'h1',
      user_id: 'u1',
      client_habit_id: 'c1',
      name: 'Stretch',
      description: null,
      icon: 'sparkles',
      category: 'wellness',
      target: 1,
      unit: null,
      reminder_enabled: false,
      reminder_time: null,
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }

    expect(mapHabitRow({ ...base, frequency_type: 'daily', frequency_days: null, frequency_times_per_week: null }).frequency).toEqual({
      type: 'daily',
    })
    expect(
      mapHabitRow({ ...base, frequency_type: 'weekdays', frequency_days: [1, 3, 5], frequency_times_per_week: null }).frequency,
    ).toEqual({ type: 'weekdays', days: [1, 3, 5] })
    expect(
      mapHabitRow({ ...base, frequency_type: 'weekly', frequency_days: null, frequency_times_per_week: 4 }).frequency,
    ).toEqual({ type: 'weekly', timesPerWeek: 4 })
  })

  it('maps habit entry, water goal and water log rows', () => {
    expect(mapHabitEntryRow({ id: 'e1', user_id: 'u1', habit_id: 'h1', client_entry_id: 'c1', log_date: '2024-06-01', completed_at: 'x' })).toEqual({
      id: 'e1',
      habitId: 'h1',
      date: '2024-06-01',
      completedAt: 'x',
    })

    expect(mapWaterGoalRow({ user_id: 'u1', goal_ml: 2500, preferred_unit: 'l', updated_at: '' })).toEqual({
      goalMl: 2500,
      preferredUnit: 'l',
    })

    expect(mapWaterLogRow({ id: 'w1', user_id: 'u1', client_log_id: 'c1', log_date: '2024-06-01', amount_ml: 250, created_at: 'x' })).toEqual({
      id: 'w1',
      date: '2024-06-01',
      amountMl: 250,
      createdAt: 'x',
    })
  })

  it('maps xp event and earned badge rows', () => {
    expect(
      mapXpEventRow({
        user_id: 'u1',
        event_id: 'workout-session-h1',
        event_type: 'workout_session_complete',
        amount: 50,
        event_date: '2024-06-01',
        source_id: 'h1',
        description: 'Completed workout',
        created_at: '',
      }),
    ).toEqual({
      id: 'workout-session-h1',
      type: 'workout_session_complete',
      amount: 50,
      date: '2024-06-01',
      sourceId: 'h1',
      description: 'Completed workout',
    })

    expect(mapEarnedBadgeRow({ user_id: 'u1', badge_id: 'first-workout', earned_at: 'x' })).toEqual({
      badgeId: 'first-workout',
      earnedAt: 'x',
    })
  })
})
