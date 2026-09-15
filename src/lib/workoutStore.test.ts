import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addSet,
  completeSession,
  deleteCustomWorkout,
  discardSession,
  getCompletedSessionsMostRecentFirst,
  getWorkoutState,
  resetWorkoutStoreForTests,
  saveCustomWorkout,
  selectProgram,
  startSession,
  updateSet,
} from './workoutStore'
import type { Workout } from '@/types/workout'

const sampleWorkout: Workout = {
  id: 'test-workout',
  name: 'Test Push Day',
  exercises: [
    { exerciseId: 'bench-press', sets: 3, reps: '6-10' },
    { exerciseId: 'lateral-raise', sets: 2, reps: '12-15' },
  ],
  estimatedMinutes: 30,
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
  it('moves the session into history, advances the day index, and clears the active session', () => {
    const before = getWorkoutState()
    startSession(sampleWorkout, 'Intermediate')
    const exerciseId = getWorkoutState().activeSession?.exercises[0]?.id ?? ''
    const setId = getWorkoutState().activeSession?.exercises[0]?.sets[0]?.id ?? ''
    updateSet(exerciseId, setId, { weightKg: 65, reps: 8, completed: true })

    const summary = completeSession()

    const state = getWorkoutState()
    expect(state.activeSession).toBeNull()
    expect(state.currentDayIndex).toBe(before.currentDayIndex + 1)
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
