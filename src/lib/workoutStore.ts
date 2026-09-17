import { useSyncExternalStore } from 'react'
import { getProgramById } from '@/data/programs'
import { mockCompletedSessions, mockWorkoutHistory, seedPersonalRecords } from '@/data/mockWorkoutHistory'
import { pushCompletedSession, pushPersonalRecord } from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
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
  resolveProgramDay,
} from '@/utils/workout'

const BASE_STORAGE_KEY = 'fitness-os:workout-store:v1'
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
  /**
   * Whether the active session is the program's scheduled day for
   * `currentDayIndex` (decided once, in `startSession`, by comparing
   * workout ids — never names). `completeSession` reads this to decide
   * whether finishing this session should advance the schedule: training
   * an alternative or custom workout instead of today's scheduled day
   * completes and logs normally, but leaves the schedule exactly where it
   * was, so the scheduled day is still waiting next time.
   */
  activeSessionIsScheduled: boolean
  history: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
  customWorkouts: Workout[]
  celebration: SessionCelebration | null
  lastCompletedSummary: SessionSummary | null
}

function createInitialState(): WorkoutStoreState {
  const isAuthenticated = getCurrentUserId() !== null
  return {
    selectedProgramId: 'intermediate-ppl',
    currentDayIndex: 0,
    activeSession: null,
    activeSessionPrIds: [],
    activeSessionIsScheduled: false,
    history: isAuthenticated ? [] : mockWorkoutHistory,
    personalRecords: isAuthenticated ? [] : seedPersonalRecords,
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
  activeSessionIsScheduled: boolean
  history: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
  customWorkouts: Workout[]
}

function loadPersistedState(): WorkoutStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<PersistedShape>
    return {
      ...initial,
      selectedProgramId: parsed.selectedProgramId ?? initial.selectedProgramId,
      currentDayIndex: parsed.currentDayIndex ?? initial.currentDayIndex,
      activeSession: parsed.activeSession ?? initial.activeSession,
      activeSessionPrIds: parsed.activeSessionPrIds ?? initial.activeSessionPrIds,
      activeSessionIsScheduled: parsed.activeSessionIsScheduled ?? initial.activeSessionIsScheduled,
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
    activeSessionIsScheduled: state.activeSessionIsScheduled,
    history: state.history,
    personalRecords: state.personalRecords,
    customWorkouts: state.customWorkouts,
  }
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), toStore)
}

let state: WorkoutStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

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
  if (getCurrentUserId() !== null) return []
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

/**
 * Whether `workout` is the program's scheduled day for `current.currentDayIndex`
 * — compared by workout id, never by name (two different days can share a
 * name-ish label, e.g. "Push A" vs "Push B", and a custom workout's id never
 * collides with a program's). No program selected, or today is a rest /
 * active-recovery day, both mean "no scheduled workout to match" — so
 * training anything at all counts as an alternative choice.
 */
function isScheduledWorkout(current: WorkoutStoreState, workout: Workout): boolean {
  const program = current.selectedProgramId ? getProgramById(current.selectedProgramId) : undefined
  if (!program) return false
  const scheduledDay = resolveProgramDay(program, current.currentDayIndex)
  return scheduledDay.type === 'workout' && scheduledDay.workout.id === workout.id
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
  setState((current) => ({
    ...current,
    activeSession: session,
    activeSessionPrIds: [],
    activeSessionIsScheduled: isScheduledWorkout(current, workout),
  }))
}

export function discardSession(): void {
  setState((current) => ({ ...current, activeSession: null, activeSessionPrIds: [], activeSessionIsScheduled: false }))
}

export function updateSet(
  exerciseId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed' | 'setType' | 'notes'>>,
): void {
  let createdRecord: PersonalRecord | null = null

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

    createdRecord = newRecord
    return {
      ...current,
      activeSession,
      personalRecords: [...current.personalRecords, newRecord],
      activeSessionPrIds: [...current.activeSessionPrIds, newRecord.id],
      celebration,
    }
  })

  if (createdRecord) void pushPersonalRecord(createdRecord)
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
  if (!state.activeSession) return null

  const completedSession: WorkoutSession = {
    ...state.activeSession,
    completedAt: new Date().toISOString(),
  }
  const newPersonalRecords = state.personalRecords.filter((record) => state.activeSessionPrIds.includes(record.id))
  const historyEntry = buildHistoryEntry(completedSession, newPersonalRecords.length)
  const summary: SessionSummary = { historyEntry, newPersonalRecords }

  setState((current) => ({
    ...current,
    activeSession: null,
    activeSessionPrIds: [],
    activeSessionIsScheduled: false,
    history: [historyEntry, ...current.history],
    // Only the scheduled day's completion moves the program forward — an
    // alternative or custom workout is logged like any other, but leaves
    // today's scheduled day waiting for next time.
    currentDayIndex: current.activeSessionIsScheduled ? current.currentDayIndex + 1 : current.currentDayIndex,
    lastCompletedSummary: summary,
  }))

  void pushCompletedSession(completedSession, historyEntry)

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

export interface WorkoutCloudSnapshot {
  history: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state: cloud
 * items win on a shared id, any local-only item is kept. History entries
 * are matched by `sessionId` (the deterministic client id — see
 * mapWorkoutSessionRow) rather than `id`, since the cloud copy's `id` is
 * the server-generated row id. Only personal records are returned for
 * push-back: a `WorkoutHistoryEntry` is a summary with no exercises/sets,
 * so a local-only history entry from before cloud sync existed has no
 * full session detail left to reconstruct and push.
 */
export function mergeWorkoutFromCloud(cloud: WorkoutCloudSnapshot): { localOnlyPersonalRecords: PersonalRecord[] } {
  const cloudSessionIds = new Set(cloud.history.map((entry) => entry.sessionId))
  const localOnlyHistory = state.history.filter((entry) => !cloudSessionIds.has(entry.sessionId))
  const mergedHistory = [...localOnlyHistory, ...cloud.history].sort((a, b) => b.date.localeCompare(a.date))

  const cloudRecordIds = new Set(cloud.personalRecords.map((record) => record.id))
  const localOnlyPersonalRecords = state.personalRecords.filter((record) => !cloudRecordIds.has(record.id))
  const mergedPersonalRecords = [...localOnlyPersonalRecords, ...cloud.personalRecords]

  setState((current) => ({ ...current, history: mergedHistory, personalRecords: mergedPersonalRecords }))

  return { localOnlyPersonalRecords }
}

/**
 * One-time cleanup for the local-duplicate bug fixed alongside
 * `mapPersonalRecordRow` (see its doc comment): before the fix, a personal
 * record already pushed to the cloud came back on the next hydration keyed
 * by Supabase's own server-generated row id instead of the original
 * client-generated id, so both ended up sitting in `personalRecords` at
 * once. `serverIds` are the raw `personal_records.id` values for this
 * user — never a `client_record_id` — so a local record's id can only ever
 * be a member of that set if it's exactly this kind of leftover duplicate;
 * nothing else could produce that id locally. Safe to call on every
 * hydration: once removed, nothing will match again, making repeat calls a
 * no-op (and a no-op skips `setState` entirely, so it never re-persists or
 * re-notifies subscribers for nothing).
 */
export function purgeLegacyServerIdPersonalRecords(serverIds: string[]): PersonalRecord[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.personalRecords.filter((record) => serverIdSet.has(record.id))
  if (removed.length === 0) return []
  setState((current) => ({
    ...current,
    personalRecords: current.personalRecords.filter((record) => !serverIdSet.has(record.id)),
  }))
  return removed
}

/**
 * Wipes all workout data for the current scope back to its clean initial
 * state (used by both tests and the production "Reset Fitness Data"
 * setting) and notifies subscribers so any mounted UI updates immediately.
 */
export function resetWorkoutStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(scopedStorageKey(BASE_STORAGE_KEY))
    } catch {
      // ignore
    }
  }
  for (const listener of listeners) listener()
}

/** Production-facing alias for the Settings "Reset Fitness Data" action. */
export const resetWorkoutData = resetWorkoutStoreForTests
