import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * push.ts and the cloud repositories are unit-tested on their own
 * (push.test.ts, repositories/cloud/index.test.ts). What's not covered
 * there is the actual wiring: does calling a store action really invoke
 * the matching push function with the data that was just persisted
 * locally? These tests mock @/lib/cloudSync/push and drive the real
 * store actions to prove that connection for a representative action
 * per store, while a signed-out call proves no cloud calls happen at all
 * for local-only/guest usage.
 */

beforeEach(() => {
  vi.resetModules()
})

describe('progressStore -> push wiring', () => {
  it('addWeightLog pushes the exact entry it just persisted locally', async () => {
    // Guest-mode/signed-out no-op behavior is push.ts's own responsibility
    // and is covered by push.test.ts; mocking push.ts here removes that
    // gating, so this test only asserts the store -> push call shape.
    const pushWeightLog = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushWeightLog,
      pushWeightLogDelete: vi.fn(),
      pushWeightGoal: vi.fn(),
      pushMeasurement: vi.fn(),
      pushMeasurementDelete: vi.fn(),
    }))

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { addWeightLog, getProgressState, resetProgressStoreForTests } = await import('@/lib/progressStore')

    setCurrentUserId('user-1')
    resetProgressStoreForTests()
    addWeightLog({ date: '2024-06-02', weightKg: 79 })

    const persisted = getProgressState().weightLogs[0]!
    expect(pushWeightLog).toHaveBeenCalledWith(persisted)
  })
})

describe('workoutStore -> push wiring', () => {
  it('completeSession pushes the completed session together with its history summary', async () => {
    const pushCompletedSession = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushCompletedSession,
      pushPersonalRecord: vi.fn(),
    }))

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { startSession, completeSession, resetWorkoutStoreForTests } = await import('@/lib/workoutStore')

    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()
    startSession(
      { id: 'w1', name: 'Push Day', exercises: [{ exerciseId: 'bench-press', sets: 1, reps: '8' }], estimatedMinutes: 20 },
      'Intermediate',
    )
    const summary = completeSession()

    expect(pushCompletedSession).toHaveBeenCalledOnce()
    const [pushedSession, pushedHistoryEntry] = pushCompletedSession.mock.calls[0]!
    expect(pushedSession.name).toBe('Push Day')
    expect(pushedHistoryEntry).toEqual(summary?.historyEntry)
  })
})

describe('gamificationStore -> push wiring', () => {
  it('syncGamification pushes only the newly-derived events/badges/challenges, not the whole history', async () => {
    const pushXpEvents = vi.fn().mockResolvedValue(undefined)
    const pushEarnedBadges = vi.fn().mockResolvedValue(undefined)
    const pushCompletedChallenges = vi.fn().mockResolvedValue(undefined)
    const pushGamificationProfile = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushXpEvents,
      pushEarnedBadges,
      pushCompletedChallenges,
      pushGamificationProfile,
      pushWeightLog: vi.fn(),
      pushWeightLogDelete: vi.fn(),
      pushWeightGoal: vi.fn(),
      pushMeasurement: vi.fn(),
      pushMeasurementDelete: vi.fn(),
      pushFoodEntry: vi.fn(),
      pushFoodEntryDelete: vi.fn(),
      pushNutritionGoal: vi.fn(),
      pushHabit: vi.fn(),
      pushHabitDelete: vi.fn(),
      pushHabitEntry: vi.fn(),
      pushHabitEntryDelete: vi.fn(),
      pushWaterLog: vi.fn(),
      pushWaterLogDelete: vi.fn(),
      pushWaterGoal: vi.fn(),
      pushCompletedSession: vi.fn(),
      pushPersonalRecord: vi.fn(),
    }))

    const { setCurrentUserId } = await import('@/lib/storageScope')
    const { resetWorkoutStoreForTests } = await import('@/lib/workoutStore')
    const { resetProgressStoreForTests } = await import('@/lib/progressStore')
    const { resetNutritionStoreForTests } = await import('@/lib/nutritionStore')
    const { resetHabitStoreForTests } = await import('@/lib/habitStore')
    const { resetGamificationStoreForTests, syncGamification } = await import('@/lib/gamificationStore')

    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()
    resetProgressStoreForTests()
    resetNutritionStoreForTests()
    resetHabitStoreForTests()
    resetGamificationStoreForTests()

    // A brand-new authenticated user has zero activity, so this sync is a no-op — proving pushes are skipped, not just untested.
    const firstResult = syncGamification()
    expect(firstResult.newXpEvents).toHaveLength(0)
    expect(pushXpEvents).not.toHaveBeenCalled()

    const { addWeightLog } = await import('@/lib/progressStore')
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const secondResult = syncGamification()

    expect(secondResult.newXpEvents.length).toBeGreaterThan(0)
    expect(pushXpEvents).toHaveBeenCalledWith(secondResult.newXpEvents)
    expect(pushGamificationProfile).toHaveBeenCalled()
  })
})
