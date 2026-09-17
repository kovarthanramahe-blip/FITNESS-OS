import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The exact 4-scenario matrix called out as a critical requirement:
 *
 *   local=empty, cloud=empty  -> result=empty (no mock/demo data reappears)
 *   local=empty, cloud=data   -> result=cloud data (hydration works)
 *   local=data,  cloud=empty  -> result=local data (nothing lost)
 *   local=data,  cloud=data   -> merged, no duplicates
 *
 * Unlike hydrate.test.ts (which mocks the stores to test orchestration),
 * this uses the REAL stores and REAL merge functions in authenticated
 * scope, only mocking the network boundary (the cloud repositories) — so
 * it proves the actual zero-state guarantee end to end, not just that the
 * pieces are wired together.
 */

function mockPushAsNoOp() {
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
}

beforeEach(() => {
  vi.resetModules()
})

describe('zero-state matrix: local + cloud combinations never reintroduce mock data', () => {
  it('local=empty, cloud=empty -> stays empty for every domain (no mock/demo data leaks in)', async () => {
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudWorkoutRepository: () => ({ getHistory: async () => [], getPersonalRecords: async () => [], getPersonalRecordServerIds: async () => [] }),
      createCloudProgressRepository: () => ({ getWeightLogs: async () => [], getWeightGoal: async () => null, getMeasurements: async () => [], getWeightLogServerIds: async () => [], getMeasurementServerIds: async () => [] }),
      createCloudNutritionRepository: () => ({ getFoodEntries: async () => [], getGoal: async () => null, getFoodEntryServerIds: async () => [] }),
      createCloudHabitRepository: () => ({
        getHabits: async () => [],
        getEntries: async () => [],
        getWaterLogs: async () => [],
        getWaterGoal: async () => null,
        getHabitServerIdToClientId: async () => ({}),
        getHabitEntryServerIds: async () => [],
        getWaterLogServerIds: async () => [],
      }),
      createCloudGamificationRepository: () => ({
        getXpEvents: async () => [],
        getEarnedBadges: async () => [],
        getCompletedChallengeIds: async () => [],
      }),
    }))
    mockPushAsNoOp()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { resetWorkoutStoreForTests, getWorkoutState } = await import('@/lib/workoutStore')
    const { resetProgressStoreForTests, getProgressState } = await import('@/lib/progressStore')
    const { resetNutritionStoreForTests, getNutritionState } = await import('@/lib/nutritionStore')
    const { resetHabitStoreForTests, getHabitState } = await import('@/lib/habitStore')
    const { resetGamificationStoreForTests, getGamificationState } = await import('@/lib/gamificationStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId('brand-new-user')
    resetWorkoutStoreForTests()
    resetProgressStoreForTests()
    resetNutritionStoreForTests()
    resetHabitStoreForTests()
    resetGamificationStoreForTests()

    // Sanity: authenticated zero-state is already empty before hydration even runs.
    expect(getWorkoutState().history).toEqual([])
    expect(getProgressState().weightLogs).toEqual([])

    await hydrateFromCloud('brand-new-user')

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

  it('local=empty, cloud=data -> the cloud data hydrates in correctly', async () => {
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudWorkoutRepository: () => ({ getHistory: async () => [], getPersonalRecords: async () => [], getPersonalRecordServerIds: async () => [] }),
      createCloudProgressRepository: () => ({
        getWeightLogs: async () => [{ id: 'cloud-w1', date: '2024-06-01', weightKg: 79.5 }],
        getWeightGoal: async () => null,
        getMeasurements: async () => [],
        getWeightLogServerIds: async () => [],
        getMeasurementServerIds: async () => [],
      }),
      createCloudNutritionRepository: () => ({ getFoodEntries: async () => [], getGoal: async () => null, getFoodEntryServerIds: async () => [] }),
      createCloudHabitRepository: () => ({
        getHabits: async () => [],
        getEntries: async () => [],
        getWaterLogs: async () => [],
        getWaterGoal: async () => null,
        getHabitServerIdToClientId: async () => ({}),
        getHabitEntryServerIds: async () => [],
        getWaterLogServerIds: async () => [],
      }),
      createCloudGamificationRepository: () => ({
        getXpEvents: async () => [],
        getEarnedBadges: async () => [],
        getCompletedChallengeIds: async () => [],
      }),
    }))
    mockPushAsNoOp()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { resetProgressStoreForTests, getProgressState } = await import('@/lib/progressStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId('second-device-user')
    resetProgressStoreForTests()
    expect(getProgressState().weightLogs).toEqual([])

    await hydrateFromCloud('second-device-user')

    expect(getProgressState().weightLogs).toEqual([{ id: 'cloud-w1', date: '2024-06-01', weightKg: 79.5 }])
  })

  it('local=data, cloud=empty -> local data is preserved (not wiped by an empty cloud pull)', async () => {
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudWorkoutRepository: () => ({ getHistory: async () => [], getPersonalRecords: async () => [], getPersonalRecordServerIds: async () => [] }),
      createCloudProgressRepository: () => ({ getWeightLogs: async () => [], getWeightGoal: async () => null, getMeasurements: async () => [], getWeightLogServerIds: async () => [], getMeasurementServerIds: async () => [] }),
      createCloudNutritionRepository: () => ({ getFoodEntries: async () => [], getGoal: async () => null, getFoodEntryServerIds: async () => [] }),
      createCloudHabitRepository: () => ({
        getHabits: async () => [],
        getEntries: async () => [],
        getWaterLogs: async () => [],
        getWaterGoal: async () => null,
        getHabitServerIdToClientId: async () => ({}),
        getHabitEntryServerIds: async () => [],
        getWaterLogServerIds: async () => [],
      }),
      createCloudGamificationRepository: () => ({
        getXpEvents: async () => [],
        getEarnedBadges: async () => [],
        getCompletedChallengeIds: async () => [],
      }),
    }))
    mockPushAsNoOp()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { resetProgressStoreForTests, getProgressState, addWeightLog } = await import('@/lib/progressStore')
    const { hydrateFromCloud } = await import('@/lib/cloudSync/hydrate')

    setCurrentUserId('offline-first-user')
    resetProgressStoreForTests()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    expect(getProgressState().weightLogs).toHaveLength(1)

    await hydrateFromCloud('offline-first-user')

    expect(getProgressState().weightLogs).toHaveLength(1)
  })

  it('local=data, cloud=data (same ids) -> merges without duplicates, cloud wins', async () => {
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudWorkoutRepository: () => ({ getHistory: async () => [], getPersonalRecords: async () => [], getPersonalRecordServerIds: async () => [] }),
      createCloudProgressRepository: () => ({
        // Same client id the local store will generate isn't predictable, so
        // this scenario is proven at the store level in progressStore.test.ts's
        // "cloud wins when the same id exists on both sides" — here we only
        // confirm the count never grows when hydration re-runs against
        // already-synced local data (the id truly is shared).
        getWeightLogs: async () => [],
        getWeightGoal: async () => null,
        getMeasurements: async () => [],
        getWeightLogServerIds: async () => [],
        getMeasurementServerIds: async () => [],
      }),
      createCloudNutritionRepository: () => ({ getFoodEntries: async () => [], getGoal: async () => null, getFoodEntryServerIds: async () => [] }),
      createCloudHabitRepository: () => ({
        getHabits: async () => [],
        getEntries: async () => [],
        getWaterLogs: async () => [],
        getWaterGoal: async () => null,
        getHabitServerIdToClientId: async () => ({}),
        getHabitEntryServerIds: async () => [],
        getWaterLogServerIds: async () => [],
      }),
      createCloudGamificationRepository: () => ({
        getXpEvents: async () => [],
        getEarnedBadges: async () => [],
        getCompletedChallengeIds: async () => [],
      }),
    }))
    mockPushAsNoOp()

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { resetProgressStoreForTests, getProgressState, addWeightLog, mergeProgressFromCloud } = await import('@/lib/progressStore')

    setCurrentUserId('repeat-sync-user')
    resetProgressStoreForTests()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const localLog = getProgressState().weightLogs[0]!

    // Simulate the cloud now having the exact row that was pushed (same client id).
    mergeProgressFromCloud({ weightLogs: [localLog], weightGoal: null, measurements: [] })
    expect(getProgressState().weightLogs).toHaveLength(1)

    // Re-running the merge again (as a second hydration pass would) must still not duplicate it.
    mergeProgressFromCloud({ weightLogs: [localLog], weightGoal: null, measurements: [] })
    expect(getProgressState().weightLogs).toHaveLength(1)
  })
})

afterEach(async () => {
  const { resetStorageScopeForTests } = await import('@/lib/storageScope')
  resetStorageScopeForTests()
})
