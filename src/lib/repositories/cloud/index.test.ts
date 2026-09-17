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
    await cloud.createCloudWorkoutRepository(userId).getPersonalRecordServerIds()
    await cloud.createCloudProgressRepository(userId).getWeightLogs()
    await cloud.createCloudProgressRepository(userId).getMeasurements()
    await cloud.createCloudProgressRepository(userId).getWeightLogServerIds()
    await cloud.createCloudProgressRepository(userId).getMeasurementServerIds()
    await cloud.createCloudNutritionRepository(userId).getFoodEntries()
    await cloud.createCloudNutritionRepository(userId).getFoodEntryServerIds()
    await cloud.createCloudHabitRepository(userId).getHabits()
    await cloud.createCloudHabitRepository(userId).getEntries()
    await cloud.createCloudHabitRepository(userId).getWaterLogs()
    await cloud.createCloudHabitRepository(userId).getHabitServerIdToClientId()
    await cloud.createCloudHabitRepository(userId).getHabitEntryServerIds()
    await cloud.createCloudHabitRepository(userId).getWaterLogServerIds()
    await cloud.createCloudGamificationRepository(userId).getXpEvents()
    await cloud.createCloudGamificationRepository(userId).getEarnedBadges()
    await cloud.createCloudGamificationRepository(userId).getCompletedChallengeIds()

    // Point 11 (multi-user isolation): every one of the new legacy-id
    // queries above is included in this list, and every single `.eq()`
    // call across ALL of them — old and new — is scoped to `user_id` and
    // this exact `userId`, never anything else. There is no code path by
    // which another user's server ids could enter the set this migration
    // purges against.
    expect(builder.eq.mock.calls.length).toBeGreaterThanOrEqual(18)
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

// ---------------------------------------------------------------------------
// Part 5 write methods
// ---------------------------------------------------------------------------

interface TrackedCall {
  table: string
  method: string
  args: unknown[]
}

/**
 * A richer fake than `makeBuilder` above: tracks every chained call per
 * table (so tests can assert onConflict/ignoreDuplicates options) and
 * resolves each `.from(table)` invocation from a per-table response
 * queue, so a repository method that queries the same table more than
 * once (e.g. saveCompletedSession's delete-then-insert) gets the right
 * response at each step.
 */
function createFakeSupabase(responses: Record<string, FakeResponse[]>) {
  const calls: TrackedCall[] = []
  const queues: Record<string, FakeResponse[]> = Object.fromEntries(
    Object.entries(responses).map(([table, list]) => [table, [...list]]),
  )

  function nextResponse(table: string): FakeResponse {
    const queue = queues[table]
    return queue && queue.length > 0 ? queue.shift()! : { data: null, error: null }
  }

  interface TableBuilder {
    upsert: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (value: FakeResponse) => void, reject?: (reason: unknown) => void) => Promise<void>
  }

  function makeTableBuilder(table: string): TableBuilder {
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    const builder: TableBuilder = {
      upsert: vi.fn(chain('upsert')),
      insert: vi.fn(chain('insert')),
      delete: vi.fn(chain('delete')),
      select: vi.fn(chain('select')),
      eq: vi.fn(chain('eq')),
      order: vi.fn(chain('order')),
      single: vi.fn(async () => nextResponse(table)),
      maybeSingle: vi.fn(async () => nextResponse(table)),
      then: (resolve, reject) => Promise.resolve(nextResponse(table)).then(resolve, reject),
    }
    return builder
  }

  const from = vi.fn((table: string) => makeTableBuilder(table))
  return { from, calls }
}

function callsFor(calls: TrackedCall[], table: string, method: string): TrackedCall[] {
  return calls.filter((call) => call.table === table && call.method === method)
}

describe('cloud repository writes', () => {
  describe('progress / nutrition / habit single-row upserts', () => {
    it('saveWeightLog upserts on (user_id, client_log_id)', async () => {
      const fake = createFakeSupabase({ weight_logs: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudProgressRepository } = await import('./index')

      await createCloudProgressRepository('u1').saveWeightLog({ id: 'w1', date: '2024-06-01', weightKg: 80 })

      const upsertCalls = callsFor(fake.calls, 'weight_logs', 'upsert')
      expect(upsertCalls).toHaveLength(1)
      expect(upsertCalls[0]?.args[0]).toMatchObject({ user_id: 'u1', client_log_id: 'w1', weight_kg: 80 })
      expect(upsertCalls[0]?.args[1]).toEqual({ onConflict: 'user_id,client_log_id' })
    })

    it('deleteWeightLog scopes the delete to both user_id and client_log_id', async () => {
      const fake = createFakeSupabase({ weight_logs: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudProgressRepository } = await import('./index')

      await createCloudProgressRepository('u1').deleteWeightLog('w1')

      expect(callsFor(fake.calls, 'weight_logs', 'delete')).toHaveLength(1)
      const eqCalls = callsFor(fake.calls, 'weight_logs', 'eq')
      expect(eqCalls.map((call) => call.args)).toEqual([
        ['user_id', 'u1'],
        ['client_log_id', 'w1'],
      ])
    })

    it('saveWeightGoal upserts the singleton on user_id', async () => {
      const fake = createFakeSupabase({ weight_goals: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudProgressRepository } = await import('./index')

      await createCloudProgressRepository('u1').saveWeightGoal({ startingWeightKg: 80, targetWeightKg: 75, startDate: '2024-06-01' })

      const upsertCalls = callsFor(fake.calls, 'weight_goals', 'upsert')
      expect(upsertCalls[0]?.args[1]).toEqual({ onConflict: 'user_id' })
    })

    it('saveFoodEntry upserts on (user_id, client_entry_id)', async () => {
      const fake = createFakeSupabase({ food_entries: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudNutritionRepository } = await import('./index')

      await createCloudNutritionRepository('u1').saveFoodEntry({
        id: 'f1',
        foodId: 'egg',
        foodName: 'Egg',
        meal: 'breakfast',
        quantity: 1,
        servingUnit: 'egg',
        calories: 78,
        protein: 6,
        carbohydrates: 0.6,
        fat: 5,
        fiber: 0,
        date: '2024-06-01',
        createdAt: '2024-06-01T08:00:00.000Z',
      })

      expect(callsFor(fake.calls, 'food_entries', 'upsert')[0]?.args[1]).toEqual({ onConflict: 'user_id,client_entry_id' })
    })

    it('saveHabit upserts on (user_id, client_habit_id)', async () => {
      const fake = createFakeSupabase({ habits: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudHabitRepository } = await import('./index')

      await createCloudHabitRepository('u1').saveHabit({
        id: 'h1',
        name: 'Drink water',
        icon: 'droplets',
        category: 'hydration',
        frequency: { type: 'daily' },
        target: 1,
        reminderEnabled: false,
        active: true,
        createdAt: '2024-06-01T08:00:00.000Z',
      })

      expect(callsFor(fake.calls, 'habits', 'upsert')[0]?.args[1]).toEqual({ onConflict: 'user_id,client_habit_id' })
    })
  })

  describe('saveEntry (habit_entries) resolves the parent habit_id server-side', () => {
    it('upserts the parent habit first, then the entry using its returned server id', async () => {
      const fake = createFakeSupabase({
        habits: [{ data: { id: 'server-habit-1' }, error: null }],
        habit_entries: [{ data: null, error: null }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudHabitRepository } = await import('./index')

      await createCloudHabitRepository('u1').saveEntry(
        { id: 'entry-1', habitId: 'client-habit-1', date: '2024-06-01', completedAt: '2024-06-01T08:00:00.000Z' },
        {
          id: 'client-habit-1',
          name: 'Drink water',
          icon: 'droplets',
          category: 'hydration',
          frequency: { type: 'daily' },
          target: 1,
          reminderEnabled: false,
          active: true,
          createdAt: '2024-06-01T08:00:00.000Z',
        },
      )

      const entryUpsert = callsFor(fake.calls, 'habit_entries', 'upsert')
      expect(entryUpsert).toHaveLength(1)
      expect(entryUpsert[0]?.args[0]).toMatchObject({ habit_id: 'server-habit-1', client_entry_id: 'entry-1' })
    })
  })

  describe('saveCompletedSession', () => {
    const session = {
      id: 'client-session-1',
      name: 'Push A',
      level: 'Intermediate' as const,
      startedAt: '2024-06-01T18:00:00.000Z',
      completedAt: '2024-06-01T18:50:00.000Z',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'bench-press',
          name: 'Bench Press',
          muscleGroup: 'Chest',
          targetReps: '8-10',
          restSeconds: 90,
          sets: [{ id: 'set-1', setNumber: 1, weightKg: 80, reps: 8, completed: true }],
        },
      ],
    }
    const historyEntry = {
      id: 'history-1',
      sessionId: 'client-session-1',
      date: '2024-06-01T18:50:00.000Z',
      name: 'Push A',
      durationMinutes: 50,
      volumeKg: 640,
      exerciseCount: 1,
      setCount: 1,
      personalRecordCount: 0,
      estimatedCalories: 400,
    }

    it('upserts the session by client_session_id, replaces exercises, and inserts their sets', async () => {
      const fake = createFakeSupabase({
        workout_sessions: [{ data: { id: 'server-session-1' }, error: null }],
        workout_exercises: [
          { data: null, error: null }, // delete
          { data: [{ id: 'server-exercise-1', position: 0 }], error: null }, // insert + select
        ],
        workout_sets: [{ data: null, error: null }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudWorkoutRepository } = await import('./index')

      await createCloudWorkoutRepository('u1').saveCompletedSession(session, historyEntry)

      const sessionUpsert = callsFor(fake.calls, 'workout_sessions', 'upsert')
      expect(sessionUpsert[0]?.args[0]).toMatchObject({ client_session_id: 'client-session-1', user_id: 'u1' })
      expect(sessionUpsert[0]?.args[1]).toEqual({ onConflict: 'user_id,client_session_id' })

      const exerciseDelete = callsFor(fake.calls, 'workout_exercises', 'delete')
      expect(exerciseDelete).toHaveLength(1)
      const exerciseEq = callsFor(fake.calls, 'workout_exercises', 'eq')
      expect(exerciseEq.map((call) => call.args)).toEqual([
        ['session_id', 'server-session-1'],
        ['user_id', 'u1'],
      ])

      const exerciseInsert = callsFor(fake.calls, 'workout_exercises', 'insert')
      expect(exerciseInsert[0]?.args[0]).toEqual([
        expect.objectContaining({ session_id: 'server-session-1', exercise_id: 'bench-press', position: 0 }),
      ])

      const setInsert = callsFor(fake.calls, 'workout_sets', 'insert')
      expect(setInsert[0]?.args[0]).toEqual([expect.objectContaining({ exercise_id: 'server-exercise-1', weight_kg: 80 })])
    })

    it('is idempotent: replacing exercises/sets never produces duplicates on a retried sync', async () => {
      // Deleting all exercises for the session before re-inserting means a
      // second call with identical input leaves exactly one exercise/set
      // row per exercise, never two — this is what the fake demonstrates
      // by only ever seeing one insert per saveCompletedSession call.
      const fake = createFakeSupabase({
        workout_sessions: [
          { data: { id: 'server-session-1' }, error: null },
          { data: { id: 'server-session-1' }, error: null },
        ],
        workout_exercises: [
          { data: null, error: null },
          { data: [{ id: 'server-exercise-1', position: 0 }], error: null },
          { data: null, error: null },
          { data: [{ id: 'server-exercise-2', position: 0 }], error: null },
        ],
        workout_sets: [
          { data: null, error: null },
          { data: null, error: null },
        ],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudWorkoutRepository } = await import('./index')
      const repo = createCloudWorkoutRepository('u1')

      await repo.saveCompletedSession(session, historyEntry)
      await repo.saveCompletedSession(session, historyEntry)

      expect(callsFor(fake.calls, 'workout_exercises', 'delete')).toHaveLength(2)
      expect(callsFor(fake.calls, 'workout_exercises', 'insert')).toHaveLength(2)
      expect(callsFor(fake.calls, 'workout_sets', 'insert')).toHaveLength(2)
    })

    it('propagates an error from the session upsert without inserting exercises', async () => {
      const fake = createFakeSupabase({
        workout_sessions: [{ data: null, error: { message: 'RLS denied' } }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudWorkoutRepository } = await import('./index')

      await expect(createCloudWorkoutRepository('u1').saveCompletedSession(session, historyEntry)).rejects.toEqual({
        message: 'RLS denied',
      })
      expect(callsFor(fake.calls, 'workout_exercises', 'insert')).toHaveLength(0)
    })
  })

  describe('XP anti-farming: xp_events / earned_badges / challenge_completions upserts ignore duplicates', () => {
    it('saveXpEvents upserts on the (user_id, event_id) primary key with ignoreDuplicates', async () => {
      const fake = createFakeSupabase({ xp_events: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudGamificationRepository } = await import('./index')

      await createCloudGamificationRepository('u1').saveXpEvents([
        { id: 'workout-session-complete:history-1', type: 'workout_session_complete', amount: 50, date: '2024-06-01', sourceId: 'history-1', description: 'Completed workout' },
      ])

      const upsertCalls = callsFor(fake.calls, 'xp_events', 'upsert')
      expect(upsertCalls[0]?.args[1]).toEqual({ onConflict: 'user_id,event_id', ignoreDuplicates: true })
    })

    it('does not call the database at all for an empty batch', async () => {
      const fake = createFakeSupabase({})
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudGamificationRepository } = await import('./index')

      await createCloudGamificationRepository('u1').saveXpEvents([])

      expect(fake.from).not.toHaveBeenCalled()
    })

    it('saveEarnedBadges upserts on (user_id, badge_id) with ignoreDuplicates', async () => {
      const fake = createFakeSupabase({ earned_badges: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudGamificationRepository } = await import('./index')

      await createCloudGamificationRepository('u1').saveEarnedBadges([{ badgeId: 'first-workout', earnedAt: '2024-06-01T00:00:00.000Z' }])

      expect(callsFor(fake.calls, 'earned_badges', 'upsert')[0]?.args[1]).toEqual({
        onConflict: 'user_id,badge_id',
        ignoreDuplicates: true,
      })
    })

    it('saveCompletedChallenges upserts on (user_id, instance_id) with ignoreDuplicates', async () => {
      const fake = createFakeSupabase({ challenge_completions: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudGamificationRepository } = await import('./index')

      await createCloudGamificationRepository('u1').saveCompletedChallenges(['daily-workout:2024-06-01'], '2024-06-01T00:00:00.000Z')

      expect(callsFor(fake.calls, 'challenge_completions', 'upsert')[0]?.args[1]).toEqual({
        onConflict: 'user_id,instance_id',
        ignoreDuplicates: true,
      })
    })

    it('ensureProfile upserts on user_id with ignoreDuplicates so an existing createdAt is never overwritten', async () => {
      const fake = createFakeSupabase({ gamification_profiles: [{ data: null, error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudGamificationRepository } = await import('./index')

      await createCloudGamificationRepository('u1').ensureProfile('2024-06-01T00:00:00.000Z')

      const upsertCalls = callsFor(fake.calls, 'gamification_profiles', 'upsert')
      expect(upsertCalls[0]?.args[0]).toEqual({ user_id: 'u1', created_at: '2024-06-01T00:00:00.000Z' })
      expect(upsertCalls[0]?.args[1]).toEqual({ onConflict: 'user_id', ignoreDuplicates: true })
    })
  })

  describe('legacy local-duplicate cleanup support (one-time migration)', () => {
    it('getPersonalRecordServerIds reads raw ids scoped by user_id', async () => {
      const fake = createFakeSupabase({ personal_records: [{ data: [{ id: 's1' }, { id: 's2' }], error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudWorkoutRepository } = await import('./index')

      const ids = await createCloudWorkoutRepository('u1').getPersonalRecordServerIds()

      expect(ids).toEqual(['s1', 's2'])
      expect(callsFor(fake.calls, 'personal_records', 'eq')).toEqual([{ table: 'personal_records', method: 'eq', args: ['user_id', 'u1'] }])
    })

    it('getWeightLogServerIds and getMeasurementServerIds read raw ids scoped by user_id', async () => {
      const fake = createFakeSupabase({
        weight_logs: [{ data: [{ id: 'w1' }], error: null }],
        body_measurements: [{ data: [{ id: 'm1' }], error: null }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudProgressRepository } = await import('./index')
      const repo = createCloudProgressRepository('u1')

      expect(await repo.getWeightLogServerIds()).toEqual(['w1'])
      expect(await repo.getMeasurementServerIds()).toEqual(['m1'])
    })

    it('getFoodEntryServerIds reads raw ids scoped by user_id', async () => {
      const fake = createFakeSupabase({ food_entries: [{ data: [{ id: 'f1' }], error: null }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudNutritionRepository } = await import('./index')

      expect(await createCloudNutritionRepository('u1').getFoodEntryServerIds()).toEqual(['f1'])
    })

    it('getHabitServerIdToClientId maps every habit row id to its client_habit_id', async () => {
      const fake = createFakeSupabase({
        habits: [{ data: [{ id: 'server-h1', client_habit_id: 'client-h1' }, { id: 'server-h2', client_habit_id: 'client-h2' }], error: null }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudHabitRepository } = await import('./index')

      expect(await createCloudHabitRepository('u1').getHabitServerIdToClientId()).toEqual({
        'server-h1': 'client-h1',
        'server-h2': 'client-h2',
      })
    })

    it('getHabitEntryServerIds and getWaterLogServerIds read raw ids scoped by user_id', async () => {
      const fake = createFakeSupabase({
        habit_entries: [{ data: [{ id: 'e1' }], error: null }],
        water_logs: [{ data: [{ id: 'wl1' }], error: null }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudHabitRepository } = await import('./index')
      const repo = createCloudHabitRepository('u1')

      expect(await repo.getHabitEntryServerIds()).toEqual(['e1'])
      expect(await repo.getWaterLogServerIds()).toEqual(['wl1'])
    })

    it('propagates an error instead of swallowing it', async () => {
      const fake = createFakeSupabase({ personal_records: [{ data: null, error: { message: 'RLS denied' } }] })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { createCloudWorkoutRepository } = await import('./index')

      await expect(createCloudWorkoutRepository('u1').getPersonalRecordServerIds()).rejects.toEqual({ message: 'RLS denied' })
    })
  })

  describe('deleteAllCloudUserData', () => {
    it('deletes every user-owned table scoped by user_id, and never touches profiles', async () => {
      const fake = createFakeSupabase({})
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { deleteAllCloudUserData } = await import('./index')

      await deleteAllCloudUserData('u1')

      const deletedTables = fake.calls.filter((call) => call.method === 'delete').map((call) => call.table)
      expect(deletedTables).toEqual(
        expect.arrayContaining([
          'workout_sessions',
          'personal_records',
          'weight_logs',
          'body_measurements',
          'weight_goals',
          'nutrition_goals',
          'food_entries',
          'habits',
          'water_goals',
          'water_logs',
          'gamification_profiles',
          'xp_events',
          'earned_badges',
          'challenge_completions',
        ]),
      )
      expect(deletedTables).not.toContain('profiles')
      for (const call of fake.calls.filter((c) => c.method === 'eq')) {
        expect(call.args).toEqual(['user_id', 'u1'])
      }
    })

    it('attempts every table even if one fails, then throws an aggregated error', async () => {
      const fake = createFakeSupabase({
        workout_sessions: [{ data: null, error: { message: 'network error' } }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { deleteAllCloudUserData } = await import('./index')

      await expect(deleteAllCloudUserData('u1')).rejects.toThrow(/workout_sessions: network error/)

      // Every other table was still attempted — one failure doesn't abandon the rest of the reset.
      const deletedTables = fake.calls.filter((call) => call.method === 'delete').map((call) => call.table)
      expect(deletedTables).toContain('xp_events')
      expect(deletedTables).toContain('habits')
      expect(deletedTables).toHaveLength(14)
    })

    it('reports every failing table, not just the first, when more than one errors', async () => {
      const fake = createFakeSupabase({
        workout_sessions: [{ data: null, error: { message: 'boom 1' } }],
        habits: [{ data: null, error: { message: 'boom 2' } }],
      })
      vi.doMock('@/lib/supabase', () => ({ supabase: fake }))
      const { deleteAllCloudUserData } = await import('./index')

      let caught: Error | null = null
      try {
        await deleteAllCloudUserData('u1')
      } catch (error) {
        caught = error as Error
      }

      expect(caught?.message).toMatch(/2 table/)
      expect(caught?.message).toMatch(/boom 1/)
      expect(caught?.message).toMatch(/boom 2/)
    })
  })
})
