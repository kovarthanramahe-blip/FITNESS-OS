import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeResponse {
  data: unknown
  error: unknown
}

function makeBuilder(response: FakeResponse) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => response),
    then: (resolve: (value: FakeResponse) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve(response).then(resolve, reject),
  }
  return builder
}

const WORKOUT_SESSION_ROW = {
  id: 'row-1',
  user_id: 'u1',
  client_session_id: 'session-1',
  name: 'Push A',
  level: null,
  started_at: '2024-06-01T18:00:00.000Z',
  completed_at: '2024-06-01T18:50:00.000Z',
  duration_minutes: 50,
  volume_kg: 1000,
  exercise_count: 5,
  set_count: 15,
  personal_record_count: 0,
  estimated_calories: 400,
  created_at: '2024-06-01T18:50:01.000Z',
}

beforeEach(() => {
  vi.resetModules()
})

describe('cloud repositories', () => {
  it('queries the right table, filters by user_id, orders history, and maps rows', async () => {
    const builder = makeBuilder({ data: [WORKOUT_SESSION_ROW], error: null })
    const from = vi.fn(() => builder)
    vi.doMock('@/lib/supabase', () => ({ supabase: { from } }))

    const { createCloudWorkoutRepository } = await import('./index')
    const history = await createCloudWorkoutRepository('u1').getHistory()

    expect(from).toHaveBeenCalledWith('workout_sessions')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.order).toHaveBeenCalledWith('completed_at', { ascending: false })
    expect(history).toEqual([{ id: 'row-1', sessionId: 'session-1', date: '2024-06-01T18:50:00.000Z', name: 'Push A', durationMinutes: 50, volumeKg: 1000, exerciseCount: 5, setCount: 15, personalRecordCount: 0, estimatedCalories: 400 }])
  })

  it('throws the Supabase error rather than swallowing it', async () => {
    const builder = makeBuilder({ data: null, error: { message: 'RLS denied' } })
    vi.doMock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => builder) } }))

    const { createCloudWorkoutRepository } = await import('./index')
    await expect(createCloudWorkoutRepository('u1').getHistory()).rejects.toEqual({ message: 'RLS denied' })
  })

  it('returns null (not an error) when a goal/singleton row does not exist yet', async () => {
    const builder = makeBuilder({ data: null, error: null })
    vi.doMock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => builder) } }))

    const { createCloudProgressRepository } = await import('./index')
    await expect(createCloudProgressRepository('u1').getWeightGoal()).resolves.toBeNull()
  })

  it('filters every domain read by the given user id — defense in depth alongside RLS', async () => {
    const builder = makeBuilder({ data: [], error: null })
    vi.doMock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => builder) } }))

    const cloud = await import('./index')
    const userId = 'user-123'
    await cloud.createCloudWorkoutRepository(userId).getHistory()
    await cloud.createCloudWorkoutRepository(userId).getPersonalRecords()
    await cloud.createCloudProgressRepository(userId).getWeightLogs()
    await cloud.createCloudProgressRepository(userId).getMeasurements()
    await cloud.createCloudNutritionRepository(userId).getFoodEntries()
    await cloud.createCloudHabitRepository(userId).getHabits()
    await cloud.createCloudHabitRepository(userId).getEntries()
    await cloud.createCloudHabitRepository(userId).getWaterLogs()
    await cloud.createCloudGamificationRepository(userId).getXpEvents()
    await cloud.createCloudGamificationRepository(userId).getEarnedBadges()
    await cloud.createCloudGamificationRepository(userId).getCompletedChallengeIds()

    expect(builder.eq.mock.calls.length).toBeGreaterThanOrEqual(11)
    for (const call of builder.eq.mock.calls) {
      expect(call).toEqual(['user_id', userId])
    }
  })

  it('createCloudRepositories wires up exactly the 5 domain repositories', async () => {
    vi.doMock('@/lib/supabase', () => ({ supabase: { from: vi.fn(() => makeBuilder({ data: [], error: null })) } }))
    const { createCloudRepositories } = await import('./index')
    const repos = createCloudRepositories('u1')
    expect(Object.keys(repos).sort()).toEqual(['gamification', 'habit', 'nutrition', 'progress', 'workout'])
  })

  it('throws a clear error instead of a null-reference if constructed without a configured client', async () => {
    vi.doMock('@/lib/supabase', () => ({ supabase: null }))
    const { createCloudWorkoutRepository } = await import('./index')
    await expect(createCloudWorkoutRepository('u1').getHistory()).rejects.toThrow(/configured Supabase client/)
  })
})
