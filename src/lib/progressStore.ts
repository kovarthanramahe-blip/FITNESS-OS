import { useSyncExternalStore } from 'react'
import { mockMeasurements } from '@/data/mockMeasurements'
import { mockWeightGoal, mockWeightLogs } from '@/data/mockWeightLog'
import type { BodyMeasurement, WeightGoal, WeightLog } from '@/types/progress'

const STORAGE_KEY = 'fitness-os:progress-store:v1'

export interface ProgressStoreState {
  weightLogs: WeightLog[]
  weightGoal: WeightGoal
  measurements: BodyMeasurement[]
}

function createInitialState(): ProgressStoreState {
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
    const raw = window.localStorage.getItem(STORAGE_KEY)
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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can fail (quota, private mode) — the session still works in-memory.
  }
}

let state: ProgressStoreState = loadPersistedState()
const listeners = new Set<() => void>()

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
  setState((current) => ({
    ...current,
    weightLogs: [...current.weightLogs, { id: nextId('weight'), ...entry }],
  }))
}

export function updateWeightLog(id: string, patch: Partial<Pick<WeightLog, 'date' | 'weightKg' | 'note'>>): void {
  setState((current) => ({
    ...current,
    weightLogs: current.weightLogs.map((log) => (log.id === id ? { ...log, ...patch } : log)),
  }))
}

export function deleteWeightLog(id: string): void {
  setState((current) => ({
    ...current,
    weightLogs: current.weightLogs.filter((log) => log.id !== id),
  }))
}

export function setWeightGoal(goal: Partial<WeightGoal>): void {
  setState((current) => ({ ...current, weightGoal: { ...current.weightGoal, ...goal } }))
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
  setState((current) => ({
    ...current,
    measurements: [...current.measurements, { id: nextId('measurement'), ...entry }],
  }))
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
}

export function deleteMeasurement(id: string): void {
  setState((current) => ({
    ...current,
    measurements: current.measurements.filter((measurement) => measurement.id !== id),
  }))
}

/** Test-only: resets the module-level store to a clean initial state. */
export function resetProgressStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
