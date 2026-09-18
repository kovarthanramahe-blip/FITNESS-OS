import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mapFoodEntryRow,
  mapHabitEntryRow,
  mapHabitRow,
  mapMeasurementRow,
  mapPersonalRecordRow,
  mapWaterLogRow,
  mapWeightLogRow,
} from '@/lib/repositories/cloud/mappers'

/**
 * Integration-level coverage for the legacy local-duplicate migration
 * (see workoutStore/progressStore/nutritionStore/habitStore's
 * `purgeLegacyServerId*` functions and hydrate.ts): exercises the REAL
 * stores and the REAL `hydrateFromCloud` orchestration end to end —
 * starting from an actual pre-fix `localStorage` blob (both id copies
 * already sitting there, exactly as a real device left it), through a
 * mocked cloud boundary (built from the REAL mapper functions, so the
 * "cloud response" shape is exactly what Supabase would actually return),
 * to the final in-memory store state. Only `@/lib/repositories/cloud` and
 * `@/lib/cloudSync/push` are mocked — everything else (storageScope, every
 * domain store, hydrate.ts, the merge functions, the purge functions) is
 * the real, unmocked implementation.
 *
 * Unit tests elsewhere already prove each `purgeLegacyServerId*` function
 * in isolation; this file proves the full pipeline actually wires them
 * together correctly, including the multi-step habit/habit-entry
 * repoint that no single-function unit test can exercise end to end.
 */

const USER_ID = 'corrupted-user'

function key(base: string): string {
  return `${base}:user:${USER_ID}`
}

/** A realistic pre-fix localStorage snapshot: every affected domain has a canonical (client-id) record sitting alongside its old server-id-keyed duplicate. */
function seedCorruptedLocalStorage() {
  window.localStorage.setItem(
    key('fitness-os:workout-store:v1'),
    JSON.stringify({
      selectedProgramId: 'intermediate-ppl',
      currentDayIndex: 0,
      activeSession: null,
      activeSessionPrIds: [],
      activeSessionIsScheduled: false,
      history: [],
      personalRecords: [
        { id: 'pr-client-1', exercise: 'Bench Press', exerciseId: 'bench-press', weightKg: 100, reps: 5, date: '2024-06-01', type: 'heaviestWeight' },
        { id: 'server-pr-uuid-1', exercise: 'Bench Press', exerciseId: 'bench-press', weightKg: 100, reps: 5, date: '2024-06-01', type: 'heaviestWeight' },
        // Genuinely local-only, never synced — must survive AND remain push-eligible.
        { id: 'pr-client-local-only', exercise: 'Squat', exerciseId: 'squat', weightKg: 120, reps: 3, date: '2024-06-03', type: 'heaviestWeight' },
      ],
      customWorkouts: [],
    }),
  )
  window.localStorage.setItem(
    key('fitness-os:progress-store:v1'),
    JSON.stringify({
      weightLogs: [
        { id: 'weight-client-1', date: '2024-06-01', weightKg: 80 },
        { id: 'server-weight-uuid-1', date: '2024-06-01', weightKg: 80 },
        { id: 'weight-client-local-only', date: '2024-06-03', weightKg: 79.5 },
      ],
      weightGoal: { startingWeightKg: 0, targetWeightKg: 0, startDate: '2024-06-01' },
      measurements: [
        { id: 'measurement-client-1', type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' },
        { id: 'server-measurement-uuid-1', type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' },
      ],
    }),
  )
  window.localStorage.setItem(
    key('fitness-os:nutrition-store:v1'),
    JSON.stringify({
      entries: [
        {
          id: 'food-client-1',
          foodId: 'food-eggs',
          foodName: 'Eggs',
          meal: 'breakfast',
          quantity: 1,
          servingUnit: 'large eggs',
          calories: 140,
          protein: 12,
          carbohydrates: 1,
          fat: 10,
          fiber: 0,
          date: '2024-06-01',
          createdAt: '2024-06-01T08:00:00.000Z',
        },
        {
          id: 'server-food-uuid-1',
          foodId: 'food-eggs',
          foodName: 'Eggs',
          meal: 'breakfast',
          quantity: 1,
          servingUnit: 'large eggs',
          calories: 140,
          protein: 12,
          carbohydrates: 1,
          fat: 10,
          fiber: 0,
          date: '2024-06-01',
          createdAt: '2024-06-01T08:00:00.000Z',
        },
      ],
      goal: { dailyCalories: 2000, proteinGrams: 150, carbohydrateGrams: 200, fatGrams: 60, fiberGrams: 30 },
    }),
  )
  window.localStorage.setItem(
    key('fitness-os:habit-store:v1'),
    JSON.stringify({
      habits: [
        {
          id: 'habit-client-1',
          name: 'Drink water',
          icon: 'droplets',
          category: 'hydration',
          frequency: { type: 'daily' },
          target: 1,
          reminderEnabled: false,
          active: true,
          createdAt: '2024-06-01T00:00:00.000Z',
        },
        {
          id: 'server-habit-uuid-1',
          name: 'Drink water',
          icon: 'droplets',
          category: 'hydration',
          frequency: { type: 'daily' },
          target: 1,
          reminderEnabled: false,
          active: true,
          createdAt: '2024-06-01T00:00:00.000Z',
        },
      ],
      entries: [
        // B: canonical entry, canonical habitId — must never be modified.
        { id: 'entry-client-1', habitId: 'habit-client-1', date: '2024-06-01', completedAt: '2024-06-01T09:00:00.000Z' },
        // A: legacy duplicate entry, own id AND habitId both legacy server ids — must be removed entirely.
        { id: 'server-entry-uuid-1', habitId: 'server-habit-uuid-1', date: '2024-06-01', completedAt: '2024-06-01T09:00:00.000Z' },
        // C: own id is a normal client id (not a duplicate to remove) but habitId is still stale — must survive with habitId re-pointed.
        { id: 'entry-client-2', habitId: 'server-habit-uuid-1', date: '2024-06-02', completedAt: '2024-06-02T09:00:00.000Z' },
      ],
      waterLogs: [
        { id: 'water-client-1', date: '2024-06-01', amountMl: 250, createdAt: '2024-06-01T07:00:00.000Z' },
        { id: 'server-water-uuid-1', date: '2024-06-01', amountMl: 250, createdAt: '2024-06-01T07:00:00.000Z' },
      ],
      waterGoal: { goalMl: 2500, preferredUnit: 'l' },
    }),
  )
}

function mockCloudBoundary() {
  const pushCalls = {
    pushWeightLog: vi.fn().mockResolvedValue(undefined),
    pushMeasurement: vi.fn().mockResolvedValue(undefined),
    pushPersonalRecord: vi.fn().mockResolvedValue(undefined),
    pushFoodEntry: vi.fn().mockResolvedValue(undefined),
    pushHabit: vi.fn().mockResolvedValue(undefined),
    pushHabitEntry: vi.fn().mockResolvedValue(undefined),
    pushWaterLog: vi.fn().mockResolvedValue(undefined),
  }
  vi.doMock('@/lib/cloudSync/push', () => ({
    ...pushCalls,
    pushWeightLogDelete: vi.fn().mockResolvedValue(undefined),
    pushWeightGoal: vi.fn().mockResolvedValue(undefined),
    pushMeasurementDelete: vi.fn().mockResolvedValue(undefined),
    pushFoodEntryDelete: vi.fn().mockResolvedValue(undefined),
    pushNutritionGoal: vi.fn().mockResolvedValue(undefined),
    pushHabitDelete: vi.fn().mockResolvedValue(undefined),
    pushHabitEntryDelete: vi.fn().mockResolvedValue(undefined),
    pushWaterLogDelete: vi.fn().mockResolvedValue(undefined),
    pushWaterGoal: vi.fn().mockResolvedValue(undefined),
    pushCompletedSession: vi.fn().mockResolvedValue(undefined),
    pushGamificationProfile: vi.fn().mockResolvedValue(undefined),
    pushXpEvents: vi.fn().mockResolvedValue(undefined),
    pushEarnedBadges: vi.fn().mockResolvedValue(undefined),
    pushCompletedChallenges: vi.fn().mockResolvedValue(undefined),
  }))

  vi.doMock('@/lib/repositories/cloud', () => ({
    createCloudWorkoutRepository: () => ({
      getHistory: async () => [],
      getPersonalRecords: async () => [
        mapPersonalRecordRow({
          id: 'server-pr-uuid-1',
          user_id: USER_ID,
          client_record_id: 'pr-client-1',
          exercise: 'Bench Press',
          exercise_id: 'bench-press',
          weight_kg: 100,
          reps: 5,
          record_date: '2024-06-01',
          record_type: 'heaviestWeight',
          estimated_one_rep_max: null,
          created_at: '2024-06-01T00:00:00.000Z',
        }),
      ],
      getPersonalRecordServerIds: async () => ['server-pr-uuid-1'],
    }),
    createCloudProgressRepository: () => ({
      getWeightLogs: async () => [
        mapWeightLogRow({
          id: 'server-weight-uuid-1',
          user_id: USER_ID,
          client_log_id: 'weight-client-1',
          log_date: '2024-06-01',
          weight_kg: 80,
          note: null,
          created_at: '2024-06-01T00:00:00.000Z',
        }),
      ],
      getWeightGoal: async () => null,
      getMeasurements: async () => [
        mapMeasurementRow({
          id: 'server-measurement-uuid-1',
          user_id: USER_ID,
          client_measurement_id: 'measurement-client-1',
          measurement_type: 'Waist',
          log_date: '2024-06-01',
          value: 82,
          unit: 'cm',
          note: null,
          created_at: '2024-06-01T00:00:00.000Z',
        }),
      ],
      getWeightLogServerIds: async () => ['server-weight-uuid-1'],
      getMeasurementServerIds: async () => ['server-measurement-uuid-1'],
    }),
    createCloudNutritionRepository: () => ({
      getFoodEntries: async () => [
        mapFoodEntryRow({
          id: 'server-food-uuid-1',
          user_id: USER_ID,
          client_entry_id: 'food-client-1',
          food_id: 'food-eggs',
          food_name: 'Eggs',
          meal: 'breakfast',
          quantity: 1,
          serving_unit: 'large eggs',
          calories: 140,
          protein: 12,
          carbohydrates: 1,
          fat: 10,
          fiber: 0,
          log_date: '2024-06-01',
          created_at: '2024-06-01T08:00:00.000Z',
        }),
      ],
      getGoal: async () => null,
      getFoodEntryServerIds: async () => ['server-food-uuid-1'],
      getWaterLogs: async () => [
        mapWaterLogRow({
          id: 'server-water-uuid-1',
          user_id: USER_ID,
          client_log_id: 'water-client-1',
          log_date: '2024-06-01',
          amount_ml: 250,
          created_at: '2024-06-01T07:00:00.000Z',
        }),
      ],
      getWaterGoal: async () => null,
      getWaterLogServerIds: async () => ['server-water-uuid-1'],
    }),
    createCloudHabitRepository: () => ({
      getHabits: async () => [
        mapHabitRow({
          id: 'server-habit-uuid-1',
          user_id: USER_ID,
          client_habit_id: 'habit-client-1',
          name: 'Drink water',
          description: null,
          icon: 'droplets',
          category: 'hydration',
          frequency_type: 'daily',
          frequency_days: null,
          frequency_times_per_week: null,
          target: 1,
          unit: null,
          reminder_enabled: false,
          reminder_time: null,
          active: true,
          created_at: '2024-06-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        }),
      ],
      // Real getEntries() already resolves habitId to the client id server-side
      // (see cloud/index.ts) — only the canonical entry actually exists in the cloud.
      getEntries: async () =>
        [
          mapHabitEntryRow(
            { id: 'server-entry-canonical-uuid', user_id: USER_ID, habit_id: 'server-habit-uuid-1', client_entry_id: 'entry-client-1', log_date: '2024-06-01', completed_at: '2024-06-01T09:00:00.000Z' },
            new Map([['server-habit-uuid-1', 'habit-client-1']]),
          ),
        ],
      getHabitServerIdToClientId: async () => ({ 'server-habit-uuid-1': 'habit-client-1' }),
      getHabitEntryServerIds: async () => ['server-entry-uuid-1'],
    }),
    createCloudGamificationRepository: () => ({
      getXpEvents: async () => [],
      getEarnedBadges: async () => [],
      getCompletedChallengeIds: async () => [],
    }),
  }))

  return pushCalls
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(async () => {
  const { resetStorageScopeForTests } = await import('@/lib/storageScope')
  resetStorageScopeForTests()
  window.localStorage.clear()
})

describe('legacy local-duplicate migration — full pipeline against a realistic pre-fix localStorage snapshot', () => {
  it('reduces every affected domain to exactly one canonical record, preserves local-only records, and leaves cloud-only/unaffected domains correct', async () => {
    seedCorruptedLocalStorage()
    const pushCalls = mockCloudBoundary()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { getWorkoutState } = await import('@/lib/workoutStore')
    const { getProgressState } = await import('@/lib/progressStore')
    const { getNutritionState } = await import('@/lib/nutritionStore')
    const { getHabitState } = await import('@/lib/habitStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId(USER_ID)

    await hydrateFromCloud(USER_ID)

    // --- workout: personal records ---
    const records = getWorkoutState().personalRecords
    expect(records.map((r) => r.id).sort()).toEqual(['pr-client-1', 'pr-client-local-only'].sort())
    // TEST 16 (edited record): a local-only record's own values are never touched by the migration.
    expect(records.find((r) => r.id === 'pr-client-local-only')).toMatchObject({ weightKg: 120, reps: 3 })
    // Local-only record remains eligible for the normal push.
    expect(pushCalls.pushPersonalRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'pr-client-local-only' }))
    expect(pushCalls.pushPersonalRecord).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'server-pr-uuid-1' }))

    // --- progress: weight logs + measurements ---
    const weightLogs = getProgressState().weightLogs
    expect(weightLogs.map((l) => l.id).sort()).toEqual(['weight-client-1', 'weight-client-local-only'].sort())
    expect(pushCalls.pushWeightLog).toHaveBeenCalledWith(expect.objectContaining({ id: 'weight-client-local-only' }))
    expect(pushCalls.pushWeightLog).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'server-weight-uuid-1' }))

    const measurements = getProgressState().measurements
    expect(measurements.map((m) => m.id)).toEqual(['measurement-client-1'])

    // --- nutrition: food entries ---
    const entries = getNutritionState().entries
    expect(entries.map((e) => e.id)).toEqual(['food-client-1'])

    // --- habits: habits + entries + water logs ---
    const habits = getHabitState().habits
    expect(habits.map((h) => h.id)).toEqual(['habit-client-1'])

    const habitEntries = getHabitState().entries
    // Legacy duplicate (server-entry-uuid-1) removed entirely; the two
    // genuine entries (canonical + the stale-habitId one) both survive.
    expect(habitEntries.map((e) => e.id).sort()).toEqual(['entry-client-1', 'entry-client-2'].sort())
    // B: canonical entry's habitId is untouched.
    expect(habitEntries.find((e) => e.id === 'entry-client-1')).toMatchObject({ habitId: 'habit-client-1' })
    // C: the surviving entry with a stale habitId is re-pointed to the canonical habit id.
    expect(habitEntries.find((e) => e.id === 'entry-client-2')).toMatchObject({ habitId: 'habit-client-1' })

    // --- water (now a Nutrition metric, migrated from the legacy habit-store blob) ---
    const waterLogs = getNutritionState().waterLogs
    expect(waterLogs.map((w) => w.id)).toEqual(['water-client-1'])
  })

  // TEST 10 / point 10: reopening the app a second time changes nothing further.
  it('running the full hydration a second time (simulating closing and reopening the app again) leaves every domain unchanged', async () => {
    seedCorruptedLocalStorage()
    mockCloudBoundary()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { getWorkoutState } = await import('@/lib/workoutStore')
    const { getProgressState } = await import('@/lib/progressStore')
    const { getNutritionState } = await import('@/lib/nutritionStore')
    const { getHabitState } = await import('@/lib/habitStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId(USER_ID)
    await hydrateFromCloud(USER_ID)

    const afterFirst = {
      personalRecords: getWorkoutState().personalRecords.length,
      weightLogs: getProgressState().weightLogs.length,
      measurements: getProgressState().measurements.length,
      entries: getNutritionState().entries.length,
      habits: getHabitState().habits.length,
      habitEntries: getHabitState().entries.length,
      waterLogs: getNutritionState().waterLogs.length,
    }

    // "Close the app and reopen it": re-run hydration against the now-cleaned
    // local state, exactly as a real reopen would (module state itself is
    // preserved here since only the network boundary is mocked — the more
    // aggressive full module-destroy variant is covered per-store in each
    // store's own "local persistence survives closing and reopening" tests).
    await hydrateFromCloud(USER_ID)

    expect(getWorkoutState().personalRecords).toHaveLength(afterFirst.personalRecords)
    expect(getProgressState().weightLogs).toHaveLength(afterFirst.weightLogs)
    expect(getProgressState().measurements).toHaveLength(afterFirst.measurements)
    expect(getNutritionState().entries).toHaveLength(afterFirst.entries)
    expect(getHabitState().habits).toHaveLength(afterFirst.habits)
    expect(getHabitState().entries).toHaveLength(afterFirst.habitEntries)
    expect(getNutritionState().waterLogs).toHaveLength(afterFirst.waterLogs)
  })

  // Point 12: offline / cloud fetch failure must never destructively touch local data.
  it('a server-id fetch failure aborts that domain entirely — no merge, no purge, local data unchanged', async () => {
    seedCorruptedLocalStorage()
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushWeightLog: vi.fn().mockResolvedValue(undefined),
      pushWeightLogDelete: vi.fn().mockResolvedValue(undefined),
      pushWeightGoal: vi.fn().mockResolvedValue(undefined),
      pushMeasurement: vi.fn().mockResolvedValue(undefined),
      pushMeasurementDelete: vi.fn().mockResolvedValue(undefined),
      pushFoodEntry: vi.fn().mockResolvedValue(undefined),
      pushFoodEntryDelete: vi.fn().mockResolvedValue(undefined),
      pushNutritionGoal: vi.fn().mockResolvedValue(undefined),
      pushHabit: vi.fn().mockResolvedValue(undefined),
      pushHabitDelete: vi.fn().mockResolvedValue(undefined),
      pushHabitEntry: vi.fn().mockResolvedValue(undefined),
      pushHabitEntryDelete: vi.fn().mockResolvedValue(undefined),
      pushWaterLog: vi.fn().mockResolvedValue(undefined),
      pushWaterLogDelete: vi.fn().mockResolvedValue(undefined),
      pushWaterGoal: vi.fn().mockResolvedValue(undefined),
      pushCompletedSession: vi.fn().mockResolvedValue(undefined),
      pushPersonalRecord: vi.fn().mockResolvedValue(undefined),
      pushGamificationProfile: vi.fn().mockResolvedValue(undefined),
      pushXpEvents: vi.fn().mockResolvedValue(undefined),
      pushEarnedBadges: vi.fn().mockResolvedValue(undefined),
      pushCompletedChallenges: vi.fn().mockResolvedValue(undefined),
    }))
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudWorkoutRepository: () => ({
        getHistory: async () => [],
        getPersonalRecords: async () => [],
        // Simulates offline/network failure specifically on the new legacy-id query.
        getPersonalRecordServerIds: async () => Promise.reject(new Error('offline')),
      }),
      createCloudProgressRepository: () => ({
        getWeightLogs: async () => [],
        getWeightGoal: async () => null,
        getMeasurements: async () => [],
        getWeightLogServerIds: async () => [],
        getMeasurementServerIds: async () => [],
      }),
      createCloudNutritionRepository: () => ({
        getFoodEntries: async () => [],
        getGoal: async () => null,
        getFoodEntryServerIds: async () => [],
        getWaterLogs: async () => [],
        getWaterGoal: async () => null,
        getWaterLogServerIds: async () => [],
      }),
      createCloudHabitRepository: () => ({
        getHabits: async () => [],
        getEntries: async () => [],
        getHabitServerIdToClientId: async () => ({}),
        getHabitEntryServerIds: async () => [],
      }),
      createCloudGamificationRepository: () => ({ getXpEvents: async () => [], getEarnedBadges: async () => [], getCompletedChallengeIds: async () => [] }),
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { getWorkoutState } = await import('@/lib/workoutStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId(USER_ID)
    const before = getWorkoutState().personalRecords
    expect(before.map((r) => r.id).sort()).toEqual(['pr-client-1', 'pr-client-local-only', 'server-pr-uuid-1'].sort())

    await hydrateFromCloud(USER_ID)

    // Merge and purge for this domain never ran — the corrupted duplicate is
    // still there (untouched), exactly as it was before the failed attempt.
    expect(getWorkoutState().personalRecords).toEqual(before)
  })
})
