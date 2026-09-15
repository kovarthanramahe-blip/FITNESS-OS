import { useSyncExternalStore } from 'react'
import { mockCompletedSessions, mockWorkoutHistory, seedPersonalRecords } from '@/data/mockWorkoutHistory'
import type { PersonalRecord } from '@/types/progress'
import type {
  Difficulty,
  Workout,
  WorkoutExercise,
  WorkoutHistoryEntry,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout'
import { detectPersonalRecords, pickHeadlinePersonalRecord } from '@/utils/personalRecords'
import {
  buildHistoryEntry,
  getLastPerformanceForExercise,
  instantiateWorkoutExercises,
} from '@/utils/workout'

const STORAGE_KEY = 'fitness-os:workout-store:v1'
const PR_XP_AWARD = 100

export interface SessionCelebration {
  id: string
  exerciseId: string
  exerciseName: string
  type: 'heaviestWeight' | 'mostRepsAtWeight' | 'estimatedOneRepMax'
  weightKg: number
  reps: number
  previousBestKg?: number
  estimatedOneRepMax?: number
  xpAwarded: number
}

export interface SessionSummary {
  historyEntry: WorkoutHistoryEntry
  newPersonalRecords: PersonalRecord[]
}

export interface WorkoutStoreState {
  selectedProgramId: string | null
  currentDayIndex: number
  activeSession: WorkoutSession | null
  /** Record ids earned during the current active session — used to build the completion summary. */
  activeSessionPrIds: string[]
  history: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
  customWorkouts: Workout[]
  celebration: SessionCelebration | null
  lastCompletedSummary: SessionSummary | null
}

function createInitialState(): WorkoutStoreState {
  return {
    selectedProgramId: 'intermediate-ppl',
    currentDayIndex: 0,
    activeSession: null,
    activeSessionPrIds: [],
    history: mockWorkoutHistory,
    personalRecords: seedPersonalRecords,
    customWorkouts: [],
    celebration: null,
    lastCompletedSummary: null,
  }
}

interface PersistedShape {
  selectedProgramId: string | null
  currentDayIndex: number
  activeSession: WorkoutSession | null
  activeSessionPrIds: string[]
  history: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
  customWorkouts: Workout[]
}

function loadPersistedState(): WorkoutStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<PersistedShape>
    return {
      ...initial,
      selectedProgramId: parsed.selectedProgramId ?? initial.selectedProgramId,
      currentDayIndex: parsed.currentDayIndex ?? initial.currentDayIndex,
      activeSession: parsed.activeSession ?? initial.activeSession,
      activeSessionPrIds: parsed.activeSessionPrIds ?? initial.activeSessionPrIds,
      history: parsed.history ?? initial.history,
      personalRecords: parsed.personalRecords ?? initial.personalRecords,
      customWorkouts: parsed.customWorkouts ?? initial.customWorkouts,
    }
  } catch {
    return initial
  }
}

function persist(state: WorkoutStoreState): void {
  if (typeof window === 'undefined') return
  const toStore: PersistedShape = {
    selectedProgramId: state.selectedProgramId,
    currentDayIndex: state.currentDayIndex,
    activeSession: state.activeSession,
    activeSessionPrIds: state.activeSessionPrIds,
    history: state.history,
    personalRecords: state.personalRecords,
    customWorkouts: state.customWorkouts,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Storage can fail (quota, private mode) — the session still works in-memory.
  }
}

let state: WorkoutStoreState = loadPersistedState()
const listeners = new Set<() => void>()

function setState(updater: (current: WorkoutStoreState) => WorkoutStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): WorkoutStoreState {
  return state
}

export function useWorkoutStore(): WorkoutStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getWorkoutState(): WorkoutStoreState {
  return state
}

/** All completed sessions available for "last time" lookups, most recent first. */
export function getCompletedSessionsMostRecentFirst(): WorkoutSession[] {
  return mockCompletedSessions
    .slice()
    .sort((a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime())
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function selectProgram(programId: string): void {
  setState((current) => ({ ...current, selectedProgramId: programId, currentDayIndex: 0 }))
}

/** Pre-fills each set with the weight/reps last logged for that exercise, if any. */
function withLastPerformanceDefaults(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const history = getCompletedSessionsMostRecentFirst()
  return exercises.map((exercise) => {
    const last = getLastPerformanceForExercise(exercise.exerciseId, history)
    if (!last || last.length === 0) return exercise
    return {
      ...exercise,
      sets: exercise.sets.map((set, index) => {
        const reference = last[Math.min(index, last.length - 1)]
        if (!reference) return set
        return { ...set, weightKg: reference.weightKg, reps: reference.reps }
      }),
    }
  })
}

export function startSession(workout: Workout, level: Difficulty): void {
  const exercises = withLastPerformanceDefaults(instantiateWorkoutExercises(workout))
  const session: WorkoutSession = {
    id: nextId('session'),
    name: workout.name,
    level,
    startedAt: new Date().toISOString(),
    exercises,
  }
  setState((current) => ({ ...current, activeSession: session, activeSessionPrIds: [] }))
}

export function discardSession(): void {
  setState((current) => ({ ...current, activeSession: null, activeSessionPrIds: [] }))
}

export function updateSet(
  exerciseId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed' | 'setType' | 'notes'>>,
): void {
  setState((current) => {
    if (!current.activeSession) return current

    let justCompletedSet: WorkoutSet | null = null
    let exerciseName = ''
    let libraryExerciseId = ''

    const exercises = current.activeSession.exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise
      exerciseName = exercise.name
      libraryExerciseId = exercise.exerciseId
      return {
        ...exercise,
        sets: exercise.sets.map((set) => {
          if (set.id !== setId) return set
          const updated = { ...set, ...patch }
          if (patch.completed === true && !set.completed) justCompletedSet = updated
          return updated
        }),
      }
    })

    const activeSession = { ...current.activeSession, exercises }

    if (!justCompletedSet) {
      return { ...current, activeSession }
    }

    const detected = detectPersonalRecords(libraryExerciseId, justCompletedSet, current.personalRecords)
    const headline = pickHeadlinePersonalRecord(detected)

    if (!headline) {
      return { ...current, activeSession }
    }

    const newRecord: PersonalRecord = {
      id: nextId('pr'),
      exercise: exerciseName,
      exerciseId: libraryExerciseId,
      weightKg: headline.weightKg,
      reps: headline.reps,
      date: new Date().toISOString(),
      type: headline.type,
      estimatedOneRepMax: headline.estimatedOneRepMax,
    }

    const celebration: SessionCelebration = {
      id: newRecord.id,
      exerciseId: libraryExerciseId,
      exerciseName,
      type: headline.type,
      weightKg: headline.weightKg,
      reps: headline.reps,
      previousBestKg: headline.previousBestKg,
      estimatedOneRepMax: headline.estimatedOneRepMax,
      xpAwarded: PR_XP_AWARD,
    }

    return {
      ...current,
      activeSession,
      personalRecords: [...current.personalRecords, newRecord],
      activeSessionPrIds: [...current.activeSessionPrIds, newRecord.id],
      celebration,
    }
  })
}

export function addSet(exerciseId: string): void {
  setState((current) => {
    if (!current.activeSession) return current
    const exercises = current.activeSession.exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise
      const lastSet = exercise.sets[exercise.sets.length - 1]
      const newSet: WorkoutSet = {
        id: nextId('set'),
        setNumber: exercise.sets.length + 1,
        weightKg: lastSet?.weightKg ?? 0,
        reps: lastSet?.reps ?? 0,
        completed: false,
      }
      return { ...exercise, sets: [...exercise.sets, newSet] }
    })
    return { ...current, activeSession: { ...current.activeSession, exercises } }
  })
}

export function removeSet(exerciseId: string, setId: string): void {
  setState((current) => {
    if (!current.activeSession) return current
    const exercises = current.activeSession.exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise
      const sets = exercise.sets
        .filter((set) => set.id !== setId)
        .map((set, index) => ({ ...set, setNumber: index + 1 }))
      return { ...exercise, sets }
    })
    return { ...current, activeSession: { ...current.activeSession, exercises } }
  })
}

export function completeSession(): SessionSummary | null {
  let summary: SessionSummary | null = null

  setState((current) => {
    if (!current.activeSession) return current

    const completedSession: WorkoutSession = {
      ...current.activeSession,
      completedAt: new Date().toISOString(),
    }
    const newPersonalRecords = current.personalRecords.filter((record) =>
      current.activeSessionPrIds.includes(record.id),
    )
    const historyEntry = buildHistoryEntry(completedSession, newPersonalRecords.length)
    summary = { historyEntry, newPersonalRecords }

    return {
      ...current,
      activeSession: null,
      activeSessionPrIds: [],
      history: [historyEntry, ...current.history],
      currentDayIndex: current.currentDayIndex + 1,
      lastCompletedSummary: summary,
    }
  })

  return summary
}

export function dismissCelebration(): void {
  setState((current) => ({ ...current, celebration: null }))
}

export function dismissSummary(): void {
  setState((current) => ({ ...current, lastCompletedSummary: null }))
}

export function saveCustomWorkout(workout: Workout): void {
  setState((current) => {
    const exists = current.customWorkouts.some((existing) => existing.id === workout.id)
    const customWorkouts = exists
      ? current.customWorkouts.map((existing) => (existing.id === workout.id ? workout : existing))
      : [...current.customWorkouts, workout]
    return { ...current, customWorkouts }
  })
}

export function deleteCustomWorkout(workoutId: string): void {
  setState((current) => ({
    ...current,
    customWorkouts: current.customWorkouts.filter((workout) => workout.id !== workoutId),
  }))
}

/** Test-only: resets the module-level store to a clean initial state. */
export function resetWorkoutStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
