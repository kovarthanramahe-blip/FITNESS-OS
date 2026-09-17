import { beforeEach, describe, expect, it, vi } from 'vitest'

const emptyWorkoutRepo = {
  getHistory: vi.fn().mockResolvedValue([]),
  getPersonalRecords: vi.fn().mockResolvedValue([]),
  getPersonalRecordServerIds: vi.fn().mockResolvedValue([]),
}
const emptyProgressRepo = {
  getWeightLogs: vi.fn().mockResolvedValue([]),
  getWeightGoal: vi.fn().mockResolvedValue(null),
  getMeasurements: vi.fn().mockResolvedValue([]),
  getWeightLogServerIds: vi.fn().mockResolvedValue([]),
  getMeasurementServerIds: vi.fn().mockResolvedValue([]),
}
const emptyNutritionRepo = {
  getFoodEntries: vi.fn().mockResolvedValue([]),
  getGoal: vi.fn().mockResolvedValue(null),
  getFoodEntryServerIds: vi.fn().mockResolvedValue([]),
}
const emptyHabitRepo = {
  getHabits: vi.fn().mockResolvedValue([]),
  getEntries: vi.fn().mockResolvedValue([]),
  getWaterLogs: vi.fn().mockResolvedValue([]),
  getWaterGoal: vi.fn().mockResolvedValue(null),
  getHabitServerIdToClientId: vi.fn().mockResolvedValue({}),
  getHabitEntryServerIds: vi.fn().mockResolvedValue([]),
  getWaterLogServerIds: vi.fn().mockResolvedValue([]),
}
const emptyGamificationRepo = {
  getXpEvents: vi.fn().mockResolvedValue([]),
  getEarnedBadges: vi.fn().mockResolvedValue([]),
  getCompletedChallengeIds: vi.fn().mockResolvedValue([]),
}

interface RepoOverrides {
  workout?: unknown
  progress?: unknown
  nutrition?: unknown
  habit?: unknown
  gamification?: unknown
}

function mockRepos(overrides: RepoOverrides = {}) {
  vi.doMock('@/lib/repositories/cloud', () => ({
    createCloudWorkoutRepository: vi.fn(() => overrides.workout ?? emptyWorkoutRepo),
    createCloudProgressRepository: vi.fn(() => overrides.progress ?? emptyProgressRepo),
    createCloudNutritionRepository: vi.fn(() => overrides.nutrition ?? emptyNutritionRepo),
    createCloudHabitRepository: vi.fn(() => overrides.habit ?? emptyHabitRepo),
    createCloudGamificationRepository: vi.fn(() => overrides.gamification ?? emptyGamificationRepo),
  }))
}

function mockStores() {
  const mergeWorkoutFromCloud = vi.fn(() => ({ localOnlyPersonalRecords: [] }))
  const mergeProgressFromCloud = vi.fn(() => ({ localOnlyWeightLogs: [], localOnlyMeasurements: [], weightGoalToPush: null }))
  const mergeNutritionFromCloud = vi.fn(() => ({ localOnlyEntries: [], goalToPush: null }))
  const mergeHabitFromCloud = vi.fn(() => ({
    localOnlyHabits: [],
    localOnlyEntries: [],
    localOnlyWaterLogs: [],
    waterGoalToPush: null,
  }))
  const mergeGamificationFromCloud = vi.fn(() => ({
    localOnlyXpEvents: [],
    localOnlyEarnedBadges: [],
    localOnlyChallengeIds: [],
  }))
  // No-op by default (nothing to purge) — individual tests override with
  // vi.doMock to exercise the legacy-duplicate cleanup path itself.
  const purgeLegacyServerIdPersonalRecords = vi.fn(() => [])
  const purgeLegacyServerIdWeightLogs = vi.fn(() => [])
  const purgeLegacyServerIdMeasurements = vi.fn(() => [])
  const purgeLegacyServerIdFoodEntries = vi.fn(() => [])
  const purgeLegacyServerIdHabits = vi.fn(() => [])
  const purgeLegacyServerIdHabitEntries = vi.fn(() => [])
  const purgeLegacyServerIdWaterLogs = vi.fn(() => [])

  vi.doMock('@/lib/workoutStore', () => ({ mergeWorkoutFromCloud, purgeLegacyServerIdPersonalRecords }))
  vi.doMock('@/lib/progressStore', () => ({
    mergeProgressFromCloud,
    purgeLegacyServerIdWeightLogs,
    purgeLegacyServerIdMeasurements,
  }))
  vi.doMock('@/lib/nutritionStore', () => ({ mergeNutritionFromCloud, purgeLegacyServerIdFoodEntries }))
  vi.doMock('@/lib/habitStore', () => ({
    mergeHabitFromCloud,
    purgeLegacyServerIdHabits,
    purgeLegacyServerIdHabitEntries,
    purgeLegacyServerIdWaterLogs,
  }))
  vi.doMock('@/lib/gamificationStore', () => ({
    mergeGamificationFromCloud,
    getGamificationState: () => ({ createdAt: '2024-06-01T00:00:00.000Z' }),
  }))

  return {
    mergeWorkoutFromCloud,
    mergeProgressFromCloud,
    mergeNutritionFromCloud,
    mergeHabitFromCloud,
    mergeGamificationFromCloud,
    purgeLegacyServerIdPersonalRecords,
    purgeLegacyServerIdWeightLogs,
    purgeLegacyServerIdMeasurements,
    purgeLegacyServerIdFoodEntries,
    purgeLegacyServerIdHabits,
    purgeLegacyServerIdHabitEntries,
    purgeLegacyServerIdWaterLogs,
  }
}

function mockPush() {
  vi.doMock('@/lib/cloudSync/push', () => ({
    pushPersonalRecord: vi.fn().mockResolvedValue(undefined),
    pushWeightLog: vi.fn().mockResolvedValue(undefined),
    pushMeasurement: vi.fn().mockResolvedValue(undefined),
    pushWeightGoal: vi.fn().mockResolvedValue(undefined),
    pushFoodEntry: vi.fn().mockResolvedValue(undefined),
    pushNutritionGoal: vi.fn().mockResolvedValue(undefined),
    pushHabit: vi.fn().mockResolvedValue(undefined),
    pushHabitEntry: vi.fn().mockResolvedValue(undefined),
    pushWaterLog: vi.fn().mockResolvedValue(undefined),
    pushWaterGoal: vi.fn().mockResolvedValue(undefined),
    pushGamificationProfile: vi.fn().mockResolvedValue(undefined),
    pushXpEvents: vi.fn().mockResolvedValue(undefined),
    pushEarnedBadges: vi.fn().mockResolvedValue(undefined),
    pushCompletedChallenges: vi.fn().mockResolvedValue(undefined),
  }))
}

beforeEach(() => {
  vi.resetModules()
})

describe('hydrateFromCloud', () => {
  it('pulls all 5 domains for the given user id', async () => {
    mockRepos()
    mockStores()
    mockPush()
    const { hydrateFromCloud } = await import('./hydrate')

    await hydrateFromCloud('user-1')

    expect(emptyWorkoutRepo.getHistory).toHaveBeenCalled()
    expect(emptyProgressRepo.getWeightLogs).toHaveBeenCalled()
    expect(emptyNutritionRepo.getFoodEntries).toHaveBeenCalled()
    expect(emptyHabitRepo.getHabits).toHaveBeenCalled()
    expect(emptyGamificationRepo.getXpEvents).toHaveBeenCalled()
  })

  it('merges the pulled data into each store', async () => {
    mockRepos()
    const stores = mockStores()
    mockPush()
    const { hydrateFromCloud } = await import('./hydrate')

    await hydrateFromCloud('user-1')

    expect(stores.mergeWorkoutFromCloud).toHaveBeenCalledWith({ history: [], personalRecords: [] })
    expect(stores.mergeGamificationFromCloud).toHaveBeenCalledWith({
      xpEvents: [],
      earnedBadges: [],
      completedChallengeIds: [],
    })
  })

  it('one domain failing to pull never blocks the others from hydrating', async () => {
    mockRepos({
      workout: {
        getHistory: vi.fn().mockRejectedValue(new Error('workout table unreachable')),
        getPersonalRecords: vi.fn().mockResolvedValue([]),
      },
    })
    const stores = mockStores()
    mockPush()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { hydrateFromCloud } = await import('./hydrate')

    await hydrateFromCloud('user-1')

    expect(stores.mergeProgressFromCloud).toHaveBeenCalled()
    expect(stores.mergeNutritionFromCloud).toHaveBeenCalled()
    expect(stores.mergeHabitFromCloud).toHaveBeenCalled()
    expect(stores.mergeGamificationFromCloud).toHaveBeenCalled()
    // The failing domain's merge is simply skipped, not retried with bad data.
    expect(stores.mergeWorkoutFromCloud).not.toHaveBeenCalled()
  })

  it('pushes local-only personal records back to the cloud after merging', async () => {
    const localOnlyRecord = { id: 'pr-1', exercise: 'Bench Press', weightKg: 100, reps: 5, date: '2024-06-01' }
    mockRepos()
    mockStores()
    vi.doMock('@/lib/workoutStore', () => ({
      mergeWorkoutFromCloud: vi.fn(() => ({ localOnlyPersonalRecords: [localOnlyRecord] })),
      purgeLegacyServerIdPersonalRecords: vi.fn(() => []),
    }))
    const pushPersonalRecord = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushPersonalRecord,
      pushWeightLog: vi.fn(),
      pushMeasurement: vi.fn(),
      pushWeightGoal: vi.fn(),
      pushFoodEntry: vi.fn(),
      pushNutritionGoal: vi.fn(),
      pushHabit: vi.fn(),
      pushHabitEntry: vi.fn(),
      pushWaterLog: vi.fn(),
      pushWaterGoal: vi.fn(),
      pushGamificationProfile: vi.fn().mockResolvedValue(undefined),
      pushXpEvents: vi.fn().mockResolvedValue(undefined),
      pushEarnedBadges: vi.fn().mockResolvedValue(undefined),
      pushCompletedChallenges: vi.fn().mockResolvedValue(undefined),
    }))

    const { hydrateFromCloud } = await import('./hydrate')
    await hydrateFromCloud('user-1')

    expect(pushPersonalRecord).toHaveBeenCalledWith(localOnlyRecord)
  })

  it('never re-pushes a local-only record that is actually a legacy server-id duplicate about to be purged', async () => {
    const legacyDuplicate = { id: 'server-generated-uuid', exercise: 'Bench Press', weightKg: 100, reps: 5, date: '2024-06-01' }
    mockRepos({ workout: { ...emptyWorkoutRepo, getPersonalRecordServerIds: vi.fn().mockResolvedValue(['server-generated-uuid']) } })
    mockStores()
    vi.doMock('@/lib/workoutStore', () => ({
      mergeWorkoutFromCloud: vi.fn(() => ({ localOnlyPersonalRecords: [legacyDuplicate] })),
      purgeLegacyServerIdPersonalRecords: vi.fn(() => [legacyDuplicate]),
    }))
    const pushPersonalRecord = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/cloudSync/push', () => ({
      pushPersonalRecord,
      pushWeightLog: vi.fn(),
      pushMeasurement: vi.fn(),
      pushWeightGoal: vi.fn(),
      pushFoodEntry: vi.fn(),
      pushNutritionGoal: vi.fn(),
      pushHabit: vi.fn(),
      pushHabitEntry: vi.fn(),
      pushWaterLog: vi.fn(),
      pushWaterGoal: vi.fn(),
      pushGamificationProfile: vi.fn().mockResolvedValue(undefined),
      pushXpEvents: vi.fn().mockResolvedValue(undefined),
      pushEarnedBadges: vi.fn().mockResolvedValue(undefined),
      pushCompletedChallenges: vi.fn().mockResolvedValue(undefined),
    }))

    const { hydrateFromCloud } = await import('./hydrate')
    await hydrateFromCloud('user-1')

    expect(pushPersonalRecord).not.toHaveBeenCalled()
  })

  it('never reads, writes, or otherwise touches the profiles table — a display name edit must survive hydration untouched', async () => {
    mockRepos()
    mockStores()
    mockPush()
    const fetchProfile = vi.fn()
    const updateProfile = vi.fn()
    vi.doMock('@/lib/profileService', () => ({ fetchProfile, updateProfile }))

    const { hydrateFromCloud } = await import('./hydrate')
    await hydrateFromCloud('user-1')

    expect(fetchProfile).not.toHaveBeenCalled()
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
