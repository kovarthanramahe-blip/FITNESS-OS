import { useSyncExternalStore } from 'react'
import { mockMeasurements } from '@/data/mockMeasurements'
import { mockWeightGoal, mockWeightLogs } from '@/data/mockWeightLog'
import { pushMeasurement, pushMeasurementDelete, pushWeightGoal, pushWeightLog, pushWeightLogDelete } from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import { getTodayDateString } from '@/utils/dateRange'
import type { BodyMeasurement, WeightGoal, WeightLog } from '@/types/progress'

const BASE_STORAGE_KEY = 'fitness-os:progress-store:v1'

export interface ProgressStoreState {
  weightLogs: WeightLog[]
  weightGoal: WeightGoal
  measurements: BodyMeasurement[]
}

function createInitialState(): ProgressStoreState {
  if (getCurrentUserId() !== null) {
    return {
      weightLogs: [],
      weightGoal: { startingWeightKg: 0, targetWeightKg: 0, startDate: getTodayDateString() },
      measurements: [],
    }
  }
  return {
    weightLogs: mockWeightLogs,
    weightGoal: mockWeightGoal,
    measurements: mockMeasurements,
  }
}

function loadPersistedState(): ProgressStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<ProgressStoreState>
    return {
      weightLogs: parsed.weightLogs ?? initial.weightLogs,
      weightGoal: parsed.weightGoal ?? initial.weightGoal,
      measurements: parsed.measurements ?? initial.measurements,
    }
  } catch {
    return initial
  }
}

function persist(state: ProgressStoreState): void {
  if (typeof window === 'undefined') return
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), state)
}

let state: ProgressStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

function setState(updater: (current: ProgressStoreState) => ProgressStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ProgressStoreState {
  return state
}

export function useProgressStore(): ProgressStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getProgressState(): ProgressStoreState {
  return state
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Weight log actions
// ---------------------------------------------------------------------------

export function addWeightLog(entry: { date: string; weightKg: number; note?: string }): void {
  const newLog: WeightLog = { id: nextId('weight'), ...entry }
  setState((current) => ({ ...current, weightLogs: [...current.weightLogs, newLog] }))
  void pushWeightLog(newLog)
}

export function updateWeightLog(id: string, patch: Partial<Pick<WeightLog, 'date' | 'weightKg' | 'note'>>): void {
  setState((current) => ({
    ...current,
    weightLogs: current.weightLogs.map((log) => (log.id === id ? { ...log, ...patch } : log)),
  }))
  const updated = state.weightLogs.find((log) => log.id === id)
  if (updated) void pushWeightLog(updated)
}

export function deleteWeightLog(id: string): void {
  setState((current) => ({
    ...current,
    weightLogs: current.weightLogs.filter((log) => log.id !== id),
  }))
  void pushWeightLogDelete(id)
}

export function setWeightGoal(goal: Partial<WeightGoal>): void {
  setState((current) => ({ ...current, weightGoal: { ...current.weightGoal, ...goal } }))
  void pushWeightGoal(state.weightGoal)
}

// ---------------------------------------------------------------------------
// Body measurement actions
// ---------------------------------------------------------------------------

export function addMeasurement(entry: {
  type: string
  date: string
  value: number
  unit: BodyMeasurement['unit']
  note?: string
}): void {
  const newMeasurement: BodyMeasurement = { id: nextId('measurement'), ...entry }
  setState((current) => ({ ...current, measurements: [...current.measurements, newMeasurement] }))
  void pushMeasurement(newMeasurement)
}

export function updateMeasurement(
  id: string,
  patch: Partial<Pick<BodyMeasurement, 'type' | 'date' | 'value' | 'unit' | 'note'>>,
): void {
  setState((current) => ({
    ...current,
    measurements: current.measurements.map((measurement) =>
      measurement.id === id ? { ...measurement, ...patch } : measurement,
    ),
  }))
  const updated = state.measurements.find((measurement) => measurement.id === id)
  if (updated) void pushMeasurement(updated)
}

export function deleteMeasurement(id: string): void {
  setState((current) => ({
    ...current,
    measurements: current.measurements.filter((measurement) => measurement.id !== id),
  }))
  void pushMeasurementDelete(id)
}

export interface ProgressCloudSnapshot {
  weightLogs: WeightLog[]
  weightGoal: WeightGoal | null
  measurements: BodyMeasurement[]
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state: cloud items
 * win on a shared id, any local-only item is kept (never silently dropped),
 * and a null cloud goal means "nothing to pull," so the local goal stands.
 * Returns exactly what still needs pushing so a fresh sign-in on this
 * device reconciles both directions instead of only pulling.
 */
export function mergeProgressFromCloud(cloud: ProgressCloudSnapshot): {
  localOnlyWeightLogs: WeightLog[]
  localOnlyMeasurements: BodyMeasurement[]
  weightGoalToPush: WeightGoal | null
} {
  const cloudLogIds = new Set(cloud.weightLogs.map((log) => log.id))
  const localOnlyWeightLogs = state.weightLogs.filter((log) => !cloudLogIds.has(log.id))

  const cloudMeasurementIds = new Set(cloud.measurements.map((measurement) => measurement.id))
  const localOnlyMeasurements = state.measurements.filter((measurement) => !cloudMeasurementIds.has(measurement.id))

  const isDefaultGoal = state.weightGoal.startingWeightKg === 0 && state.weightGoal.targetWeightKg === 0
  const weightGoalToPush = !cloud.weightGoal && !isDefaultGoal ? state.weightGoal : null

  setState((current) => ({
    weightLogs: [...localOnlyWeightLogs, ...cloud.weightLogs],
    weightGoal: cloud.weightGoal ?? current.weightGoal,
    measurements: [...localOnlyMeasurements, ...cloud.measurements],
  }))

  return { localOnlyWeightLogs, localOnlyMeasurements, weightGoalToPush }
}

/**
 * One-time cleanup for the local-duplicate bug fixed alongside
 * `mapWeightLogRow`/`mapMeasurementRow` (see mapPersonalRecordRow's doc
 * comment in cloud/mappers.ts for the full mechanism). `serverIds` are raw
 * server row ids — never a `client_*_id` — so a local record's id can only
 * be a member of that set if it's a leftover pre-fix duplicate. Safe to
 * call on every hydration: a no-op (no `setState`, no re-persist, no
 * subscriber notification) once nothing matches.
 */
export function purgeLegacyServerIdWeightLogs(serverIds: string[]): WeightLog[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.weightLogs.filter((log) => serverIdSet.has(log.id))
  if (removed.length === 0) return []
  setState((current) => ({ ...current, weightLogs: current.weightLogs.filter((log) => !serverIdSet.has(log.id)) }))
  return removed
}

/** See `purgeLegacyServerIdWeightLogs` — same mechanism, for body measurements. */
export function purgeLegacyServerIdMeasurements(serverIds: string[]): BodyMeasurement[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.measurements.filter((measurement) => serverIdSet.has(measurement.id))
  if (removed.length === 0) return []
  setState((current) => ({
    ...current,
    measurements: current.measurements.filter((measurement) => !serverIdSet.has(measurement.id)),
  }))
  return removed
}

/**
 * Wipes all progress data for the current scope back to its clean initial
 * state (used by both tests and the production "Reset Fitness Data"
 * setting) and notifies subscribers so any mounted UI updates immediately.
 */
export function resetProgressStoreForTests(): void {
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
export const resetProgressData = resetProgressStoreForTests
