import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getProgramById } from '@/data/programs'
import { onStorageFailure, resetStorageHealthForTests } from '@/lib/localStorageHealth'
import { mapPersonalRecordRow } from '@/lib/repositories/cloud/mappers'
import { resetStorageScopeForTests, scopedStorageKey, setCurrentUserId } from '@/lib/storageScope'
import {
  addSet,
  completeSession,
  deleteCustomWorkout,
  discardSession,
  getCompletedSessionsMostRecentFirst,
  getWorkoutState,
  mergeWorkoutFromCloud,
  purgeLegacyServerIdPersonalRecords,
  resetWorkoutStoreForTests,
  saveCustomWorkout,
  selectProgram,
  startSession,
  updateSet,
} from './workoutStore'
import type { Workout } from '@/types/workout'
import { resolveProgramDay } from '@/utils/workout'

const sampleWorkout: Workout = {
  id: 'test-workout',
  name: 'Test Push Day',
  exercises: [
    { exerciseId: 'bench-press', sets: 3, reps: '6-10' },
    { exerciseId: 'lateral-raise', sets: 2, reps: '12-15' },
  ],
  estimatedMinutes: 30,
}

/** The program's real, actually-scheduled workout for `dayIndex` — used wherever a test needs
 * `startSession` to be recognized as "the scheduled day", which is matched by workout id. */
function scheduledWorkoutFor(programId: string, dayIndex: number): Workout {
  const program = getProgramById(programId)
  if (!program) throw new Error(`expected the "${programId}" fixture program`)
  const day = resolveProgramDay(program, dayIndex)
  if (day.type !== 'workout') throw new Error(`expected day ${dayIndex} of "${programId}" to be a workout day`)
  return day.workout
}

beforeEach(() => {
  resetWorkoutStoreForTests()
})

describe('selectProgram', () => {
  it('updates the selected program and resets the day index', () => {
    selectProgram('advanced-ppl')
    const state = getWorkoutState()
    expect(state.selectedProgramId).toBe('advanced-ppl')
    expect(state.currentDayIndex).toBe(0)
  })
})

describe('startSession', () => {
  it('creates an active session with one exercise per template and pre-filled sets from history', () => {
    startSession(sampleWorkout, 'Intermediate')
    const { activeSession } = getWorkoutState()

    expect(activeSession).not.toBeNull()
    expect(activeSession?.name).toBe('Test Push Day')
    expect(activeSession?.exercises).toHaveLength(2)
    expect(activeSession?.exercises[0]?.sets).toHaveLength(3)
    // Bench press has seeded history (60kg x8), so the first set should be pre-filled.
    expect(activeSession?.exercises[0]?.sets[0]?.weightKg).toBe(60)
    expect(activeSession?.exercises[0]?.sets[0]?.completed).toBe(false)
  })
})

describe('updateSet', () => {
  it('updates weight and reps without marking the set complete', () => {
    startSession(sampleWorkout, 'Intermediate')
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id
    expect(setId).toBeDefined()

    updateSet('test-workout-ex0-bench-press', setId ?? '', { weightKg: 65, reps: 6 })

    const set = getWorkoutState().activeSession?.exercises[0]?.sets[0]
    expect(set?.weightKg).toBe(65)
    expect(set?.reps).toBe(6)
    expect(set?.completed).toBe(false)
  })

  it('triggers a celebration when a completed set beats the seeded PR', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''

    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })

    const state = getWorkoutState()
    expect(state.celebration).not.toBeNull()
    expect(state.celebration?.type).toBe('heaviestWeight')
    expect(state.personalRecords.some((record) => record.weightKg === 65 && record.exerciseId === 'bench-press')).toBe(
      true,
    )
    expect(state.activeSessionPrIds).toHaveLength(1)
  })

  it('does not celebrate a set that does not beat any record', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''

    updateSet(exerciseId, setId, { weightKg: 40, reps: 5, completed: true })

    expect(getWorkoutState().celebration).toBeNull()
  })
})

describe('addSet', () => {
  it('appends a new set copying the previous set values', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''

    addSet(exerciseId)

    const sets = getWorkoutState().activeSession?.exercises[0]?.sets
    expect(sets).toHaveLength(4)
    expect(sets?.[3]?.setNumber).toBe(4)
    expect(sets?.[3]?.completed).toBe(false)
  })
})

describe('completeSession', () => {
  it('moves the session into history, advances the day index, and clears the active session — for the scheduled day', () => {
    const before = getWorkoutState()
    // Starting the day's actual scheduled workout (matched by id) is what makes the day index advance.
    const scheduled = scheduledWorkoutFor(before.selectedProgramId ?? 'intermediate-ppl', before.currentDayIndex)
    startSession(scheduled, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })

    const summary = completeSession()

    const state = getWorkoutState()
    expect(state.activeSession).toBeNull()
    expect(state.currentDayIndex).toBe(before.currentDayIndex + 1)
    expect(state.history[0]?.name).toBe(scheduled.name)
    expect(summary?.newPersonalRecords).toHaveLength(1)
    expect(summary?.historyEntry.setCount).toBe(1)
  })

  it('moves an off-schedule workout into history too, but does not advance the day index', () => {
    const before = getWorkoutState()
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })

    const summary = completeSession()

    const state = getWorkoutState()
    expect(state.activeSession).toBeNull()
    expect(state.currentDayIndex).toBe(before.currentDayIndex)
    expect(state.history[0]?.name).toBe('Test Push Day')
    expect(summary?.newPersonalRecords).toHaveLength(1)
    expect(summary?.historyEntry.setCount).toBe(1)
  })

  it('does nothing when there is no active session', () => {
    const summary = completeSession()
    expect(summary).toBeNull()
  })
})

describe('discardSession', () => {
  it('clears the active session without touching history', () => {
    startSession(sampleWorkout, 'Intermediate')
    const historyLengthBefore = getWorkoutState().history.length

    discardSession()

    const state = getWorkoutState()
    expect(state.activeSession).toBeNull()
    expect(state.history).toHaveLength(historyLengthBefore)
  })
})

describe('startSession — choosing a different workout than the scheduled day', () => {
  const chosenLegs: Workout = {
    id: 'test-legs-a',
    name: 'Legs A',
    exercises: [{ exerciseId: 'squat', sets: 4, reps: '5-8' }],
    estimatedMinutes: 55,
  }

  it('starts the chosen workout, not the scheduled one — the active session records what was actually picked', () => {
    // The program is still "on" Push (whatever selectProgram/currentDayIndex says);
    // the user chooses Legs instead. startSession takes the Workout the caller
    // passes it — it never looks at the schedule itself to decide what to run.
    startSession(chosenLegs, 'Intermediate')

    expect(getWorkoutState().activeSession?.name).toBe('Legs A')
    expect(getWorkoutState().activeSession?.exercises[0]?.exerciseId).toBe('squat')
  })

  it('does not touch selectedProgramId or currentDayIndex just by starting a non-scheduled workout', () => {
    selectProgram('intermediate-ppl')
    const before = getWorkoutState()

    startSession(chosenLegs, 'Intermediate')

    const after = getWorkoutState()
    expect(after.selectedProgramId).toBe(before.selectedProgramId)
    expect(after.currentDayIndex).toBe(before.currentDayIndex)
  })

  it('workout history identifies the actually-performed workout after completion, not the scheduled one', () => {
    startSession(chosenLegs, 'Intermediate')
    completeSession()

    expect(getWorkoutState().history[0]?.name).toBe('Legs A')
  })

  it('PR detection, volume and set counts are unaffected by which workout day was chosen', () => {
    startSession(chosenLegs, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''
    updateSet(exerciseId, setId, { weightKg: 100, reps: 5, completed: true })

    const summary = completeSession()

    expect(summary?.historyEntry.volumeKg).toBe(500)
    expect(summary?.historyEntry.setCount).toBe(1)
    expect(summary?.newPersonalRecords.length).toBeGreaterThan(0)
  })
})

describe('completeSession — schedule advancement is decided by workout id, not by name', () => {
  beforeEach(() => {
    selectProgram('intermediate-ppl') // day 0 = Push A, day 1 = Pull A, day 2 = Legs A
  })

  function complete(workout: Workout) {
    startSession(workout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''
    updateSet(exerciseId, setId, { weightKg: 60, reps: 8, completed: true })
    return completeSession()
  }

  it('1. Scheduled Push -> choose Push -> complete -> schedule advances', () => {
    const before = getWorkoutState().currentDayIndex
    const pushA = scheduledWorkoutFor('intermediate-ppl', before)

    complete(pushA)

    expect(getWorkoutState().currentDayIndex).toBe(before + 1)
    expect(getWorkoutState().history[0]?.name).toBe('Push A')
  })

  it('2. Scheduled Push -> choose Pull -> complete -> schedule does NOT advance', () => {
    const before = getWorkoutState().currentDayIndex
    const pullA = scheduledWorkoutFor('intermediate-ppl', 1)

    complete(pullA)

    expect(getWorkoutState().currentDayIndex).toBe(before)
    expect(getWorkoutState().history[0]?.name).toBe('Pull A')
  })

  it('3. Scheduled Push -> choose Legs -> complete -> schedule does NOT advance', () => {
    const before = getWorkoutState().currentDayIndex
    const legsA = scheduledWorkoutFor('intermediate-ppl', 2)

    complete(legsA)

    expect(getWorkoutState().currentDayIndex).toBe(before)
    expect(getWorkoutState().history[0]?.name).toBe('Legs A')
  })

  it('4. Scheduled Push -> complete a Custom Workout -> schedule does NOT advance', () => {
    const before = getWorkoutState().currentDayIndex
    const custom: Workout = {
      id: 'custom-arm-day',
      name: 'Arm Day',
      exercises: [{ exerciseId: 'barbell-curl', sets: 3, reps: '10-12' }],
      estimatedMinutes: 30,
    }
    saveCustomWorkout(custom)

    complete(custom)

    expect(getWorkoutState().currentDayIndex).toBe(before)
    expect(getWorkoutState().history[0]?.name).toBe('Arm Day')
  })

  it('5. workout history always records the actual workout performed, scheduled or not', () => {
    const legsA = scheduledWorkoutFor('intermediate-ppl', 2)
    complete(legsA)
    expect(getWorkoutState().history[0]?.name).toBe('Legs A')

    const pushA = scheduledWorkoutFor('intermediate-ppl', getWorkoutState().currentDayIndex)
    complete(pushA)
    expect(getWorkoutState().history[0]?.name).toBe('Push A')
  })

  it('does not confuse two different days that merely share part of a name (id comparison, not name comparison)', () => {
    // advanced-ppl schedules "Push A" on day 0 and "Push B" on day 3 — same
    // family name, different ids. Only an exact id match should count as scheduled.
    selectProgram('advanced-ppl')
    const before = getWorkoutState().currentDayIndex // day 0, scheduled = Push A
    const pushB = scheduledWorkoutFor('advanced-ppl', 3)

    complete(pushB)

    expect(getWorkoutState().currentDayIndex).toBe(before)
    expect(getWorkoutState().history[0]?.name).toBe('Push B')
  })

  it('8. existing scheduled-day progression through a full rotation remains valid', () => {
    let day = getWorkoutState().currentDayIndex
    for (let i = 0; i < 3; i += 1) {
      const scheduled = scheduledWorkoutFor('intermediate-ppl', day)
      complete(scheduled)
      day += 1
      expect(getWorkoutState().currentDayIndex).toBe(day)
    }
  })
})

describe('resuming an active session preserves its scheduling context', () => {
  it('7. a resumed (reloaded) session still does not advance the schedule if it was an alternative workout', () => {
    selectProgram('intermediate-ppl')
    const before = getWorkoutState().currentDayIndex
    const legsA = scheduledWorkoutFor('intermediate-ppl', 2)
    startSession(legsA, 'Intermediate')

    // Simulate the app reloading mid-workout: re-read state fresh from the
    // same in-memory/localStorage-backed store, the way a resumed session would.
    const resumed = getWorkoutState()
    expect(resumed.activeSession?.name).toBe('Legs A')
    expect(resumed.activeSessionIsScheduled).toBe(false)

    completeSession()
    expect(getWorkoutState().currentDayIndex).toBe(before)
  })

  it('a resumed session still advances the schedule if it was the scheduled workout', () => {
    selectProgram('intermediate-ppl')
    const before = getWorkoutState().currentDayIndex
    const pushA = scheduledWorkoutFor('intermediate-ppl', before)
    startSession(pushA, 'Intermediate')

    const resumed = getWorkoutState()
    expect(resumed.activeSessionIsScheduled).toBe(true)

    completeSession()
    expect(getWorkoutState().currentDayIndex).toBe(before + 1)
  })

  it('the scheduling context is actually written to localStorage, not just held in memory', () => {
    selectProgram('intermediate-ppl')
    const legsA = scheduledWorkoutFor('intermediate-ppl', 2)
    startSession(legsA, 'Intermediate')

    const raw = window.localStorage.getItem(scopedStorageKey('fitness-os:workout-store:v1'))
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw ?? '{}') as { activeSessionIsScheduled?: boolean; activeSession?: { name?: string } }
    expect(persisted.activeSession?.name).toBe('Legs A')
    expect(persisted.activeSessionIsScheduled).toBe(false)
  })
})

describe('custom workouts', () => {
  it('saves and deletes a custom workout', () => {
    saveCustomWorkout(sampleWorkout)
    expect(getWorkoutState().customWorkouts).toHaveLength(1)

    deleteCustomWorkout(sampleWorkout.id)
    expect(getWorkoutState().customWorkouts).toHaveLength(0)
  })

  it('overwrites an existing custom workout with the same id', () => {
    saveCustomWorkout(sampleWorkout)
    saveCustomWorkout({ ...sampleWorkout, name: 'Renamed' })

    const state = getWorkoutState()
    expect(state.customWorkouts).toHaveLength(1)
    expect(state.customWorkouts[0]?.name).toBe('Renamed')
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetWorkoutStoreForTests()
  })

  it('starts a new authenticated user with no workout history or personal records', () => {
    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()

    const state = getWorkoutState()
    expect(state.history).toEqual([])
    expect(state.personalRecords).toEqual([])
  })

  it('does not use demo "last performance" data for a new authenticated user', () => {
    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()

    expect(getCompletedSessionsMostRecentFirst()).toEqual([])
  })

  it('keeps guest/demo mode seeded with mock data, unaffected by authenticated scoping', () => {
    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()
    setCurrentUserId(null)
    resetWorkoutStoreForTests()

    const state = getWorkoutState()
    expect(state.history.length).toBeGreaterThan(0)
    expect(state.personalRecords.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetWorkoutStoreForTests()
    startSession(sampleWorkout, 'Intermediate')
    completeSession()
    expect(getWorkoutState().history).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getWorkoutState().history).toEqual([])
  })
})

describe('mergeWorkoutFromCloud', () => {
  beforeEach(() => {
    setCurrentUserId('user-merge-test')
    resetWorkoutStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('unions cloud and local-only history entries, matched by sessionId not row id', () => {
    startSession(sampleWorkout, 'Intermediate')
    completeSession()
    const localEntry = getWorkoutState().history[0]!
    const cloudEntry = {
      id: 'server-row-id',
      sessionId: 'cloud-session-1',
      date: '2024-06-02',
      name: 'Cloud Session',
      durationMinutes: 40,
      volumeKg: 500,
      exerciseCount: 3,
      setCount: 9,
      personalRecordCount: 0,
      estimatedCalories: 300,
    }

    mergeWorkoutFromCloud({ history: [cloudEntry], personalRecords: [] })

    const sessionIds = getWorkoutState().history.map((entry) => entry.sessionId).sort()
    expect(sessionIds).toEqual([localEntry.sessionId, 'cloud-session-1'].sort())
  })

  it('cloud wins when a history entry shares a sessionId with a local one', () => {
    startSession(sampleWorkout, 'Intermediate')
    completeSession()
    const localEntry = getWorkoutState().history[0]!
    const cloudVersion = { ...localEntry, id: 'server-row-id', name: 'Synced name' }

    mergeWorkoutFromCloud({ history: [cloudVersion], personalRecords: [] })

    expect(getWorkoutState().history).toHaveLength(1)
    expect(getWorkoutState().history[0]?.name).toBe('Synced name')
  })

  it('returns local-only personal records for push-back, and cloud wins on a shared id', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })

    const localRecord = getWorkoutState().personalRecords[0]!
    const { localOnlyPersonalRecords } = mergeWorkoutFromCloud({ history: [], personalRecords: [] })
    expect(localOnlyPersonalRecords).toEqual([localRecord])

    const cloudVersion = { ...localRecord, weightKg: 70 }
    mergeWorkoutFromCloud({ history: [], personalRecords: [cloudVersion] })
    expect(getWorkoutState().personalRecords).toEqual([cloudVersion])
  })

  // Regression for the double-counting bug: a personal record already
  // pushed to the cloud comes back through the real mapper keyed by
  // `client_record_id` (the local id), never the server row id — feeding
  // `mapPersonalRecordRow`'s actual output in here is what makes this test
  // fail against the old `id: row.id` mapper (duplicates on the very next
  // hydration/app-reopen) and pass against the fix.
  it('hydrating the same already-synced personal record repeatedly (closing/reopening the app) never duplicates it', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })
    const localRecord = getWorkoutState().personalRecords[0]!

    const cloudRecord = mapPersonalRecordRow({
      id: 'server-generated-uuid',
      user_id: 'user-merge-test',
      client_record_id: localRecord.id,
      exercise: localRecord.exercise,
      exercise_id: localRecord.exerciseId ?? null,
      weight_kg: localRecord.weightKg,
      reps: localRecord.reps,
      record_date: localRecord.date,
      record_type: localRecord.type ?? null,
      estimated_one_rep_max: localRecord.estimatedOneRepMax ?? null,
      created_at: '2024-06-01T00:00:00.000Z',
    })

    mergeWorkoutFromCloud({ history: [], personalRecords: [cloudRecord] })
    expect(getWorkoutState().personalRecords).toHaveLength(1)

    // Close the app and reopen it (repeatedly) — the count must never grow.
    mergeWorkoutFromCloud({ history: [], personalRecords: [cloudRecord] })
    mergeWorkoutFromCloud({ history: [], personalRecords: [cloudRecord] })

    expect(getWorkoutState().personalRecords).toHaveLength(1)
    expect(getWorkoutState().personalRecords[0]!.id).toBe(localRecord.id)
  })
})

describe('purgeLegacyServerIdPersonalRecords (one-time local-duplicate cleanup)', () => {
  beforeEach(() => {
    setCurrentUserId('user-purge-test')
    resetWorkoutStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  // TEST A: fresh user, no legacy duplicates.
  it('does nothing for a fresh store with no records at all', () => {
    const removed = purgeLegacyServerIdPersonalRecords(['some-server-uuid'])
    expect(removed).toEqual([])
    expect(getWorkoutState().personalRecords).toEqual([])
  })

  // TEST B: old-style duplicate + canonical record present → duplicate removed.
  it('removes a legacy server-id-keyed record while keeping the canonical client-id one', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })
    const canonical = getWorkoutState().personalRecords[0]!
    const legacyDuplicate = { ...canonical, id: 'server-generated-uuid' }
    // Simulate the corrupted post-bug state directly: both copies present.
    mergeWorkoutFromCloud({ history: [], personalRecords: [legacyDuplicate] })
    expect(getWorkoutState().personalRecords).toHaveLength(2)

    const removed = purgeLegacyServerIdPersonalRecords(['server-generated-uuid'])

    expect(removed).toEqual([legacyDuplicate])
    expect(getWorkoutState().personalRecords).toEqual([canonical])
  })

  // TEST C: running the migration twice makes no further changes.
  it('running the purge twice is a no-op the second time', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })
    const canonical = getWorkoutState().personalRecords[0]!
    mergeWorkoutFromCloud({ history: [], personalRecords: [{ ...canonical, id: 'server-generated-uuid' }] })

    purgeLegacyServerIdPersonalRecords(['server-generated-uuid'])
    const secondRun = purgeLegacyServerIdPersonalRecords(['server-generated-uuid'])

    expect(secondRun).toEqual([])
    expect(getWorkoutState().personalRecords).toEqual([canonical])
  })

  // TEST D: two legitimate records with different client ids but
  // identical-looking values both survive — the migration never compares
  // values, only exact id membership in the known-server-id set.
  it('never removes two legitimate records that merely look alike', () => {
    const recordA = {
      id: 'pr-client-id-a',
      exercise: 'Squat',
      exerciseId: 'squat',
      weightKg: 100,
      reps: 5,
      date: '2024-06-01',
      type: 'heaviestWeight' as const,
    }
    const recordB = { ...recordA, id: 'pr-client-id-b' }
    mergeWorkoutFromCloud({ history: [], personalRecords: [recordA, recordB] })
    expect(getWorkoutState().personalRecords).toHaveLength(2)

    const removed = purgeLegacyServerIdPersonalRecords(['some-unrelated-server-uuid'])

    expect(removed).toEqual([])
    expect(getWorkoutState().personalRecords.map((r) => r.id).sort()).toEqual(['pr-client-id-a', 'pr-client-id-b'])
  })

  // TEST E: a genuinely local-only, never-synced record survives.
  it('never removes a local-only record whose id was never seen on the server', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })
    const localOnly = getWorkoutState().personalRecords[0]!

    const removed = purgeLegacyServerIdPersonalRecords(['a-server-uuid-that-is-not-this-record'])

    expect(removed).toEqual([])
    expect(getWorkoutState().personalRecords).toEqual([localOnly])
  })

  // TEST M: an existing user with no duplicates is not modified at all —
  // not even a gratuitous re-persist, since a no-op skips `setState` entirely.
  it('does not call setState (no re-persist, no subscriber notification) when there is nothing to remove', () => {
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession!.exercises[0]!.id
    const setId = getWorkoutState().activeSession!.exercises[0]!.sets[0]!.id
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })
    const before = getWorkoutState().personalRecords

    purgeLegacyServerIdPersonalRecords(['unrelated-server-uuid'])

    // Same array reference — proof nothing was ever written back.
    expect(getWorkoutState().personalRecords).toBe(before)
  })
})

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content (simulating an app restart) never grows history or personal records', async () => {
    vi.resetModules()
    const first = await import('./workoutStore')
    first.resetWorkoutStoreForTests()
    first.startSession(sampleWorkout, 'Intermediate')
    first.completeSession()
    const afterFirstOpen = {
      history: first.getWorkoutState().history.length,
      personalRecords: first.getWorkoutState().personalRecords.length,
    }

    vi.resetModules()
    const second = await import('./workoutStore')
    expect(second.getWorkoutState().history).toHaveLength(afterFirstOpen.history)
    expect(second.getWorkoutState().personalRecords).toHaveLength(afterFirstOpen.personalRecords)

    vi.resetModules()
    const third = await import('./workoutStore')
    expect(third.getWorkoutState().history).toHaveLength(afterFirstOpen.history)
    expect(third.getWorkoutState().personalRecords).toHaveLength(afterFirstOpen.personalRecords)
  })
})

describe('local persistence', () => {
  beforeEach(() => {
    resetStorageHealthForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a successful write behaves exactly as before: the mutation is readable back from localStorage', () => {
    startSession(sampleWorkout, 'Intermediate')
    completeSession()

    const raw = window.localStorage.getItem('fitness-os:workout-store:v1')
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw!) as { history: unknown[] }
    expect(persisted.history).toEqual(getWorkoutState().history)
  })

  it('a failed localStorage write never crashes the mutation, and the in-memory state still updates', () => {
    const before = getWorkoutState().history.length
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => {
      startSession(sampleWorkout, 'Intermediate')
      completeSession()
    }).not.toThrow()

    expect(getWorkoutState().history).toHaveLength(before + 1)
  })

  it('a failed write notifies exactly once via the shared storage-health channel', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const listener = vi.fn()
    onStorageFailure(listener)

    startSession(sampleWorkout, 'Intermediate')
    completeSession()
    selectProgram('advanced-ppl')

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
