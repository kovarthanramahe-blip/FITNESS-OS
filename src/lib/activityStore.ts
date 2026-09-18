import { useSyncExternalStore } from 'react'
import { getMetOption } from '@/data/activityCatalogue'
import { mockActivityEntries, mockDailySteps } from '@/data/mockActivity'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import type { ActivityEntry, ActivityIntensity, ActivityType, DailySteps } from '@/types/activity'
import { getTodayDateString } from '@/utils/dateRange'
import { estimateCaloriesBurned, resolveBodyWeightKg } from '@/utils/activity'

const BASE_STORAGE_KEY = 'fitness-os:activity-store:v1'

export interface ActivityStoreState {
  entries: ActivityEntry[]
  dailySteps: DailySteps[]
}

function createInitialState(): ActivityStoreState {
  if (getCurrentUserId() !== null) {
    return { entries: [], dailySteps: [] }
  }
  return { entries: mockActivityEntries, dailySteps: mockDailySteps }
}

function loadPersistedState(): ActivityStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    const parsed = raw ? (JSON.parse(raw) as Partial<ActivityStoreState>) : null
    return {
      entries: parsed?.entries ?? initial.entries,
      dailySteps: parsed?.dailySteps ?? initial.dailySteps,
    }
  } catch {
    return initial
  }
}

function persist(state: ActivityStoreState): void {
  if (typeof window === 'undefined') return
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), state)
}

let state: ActivityStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

function setState(updater: (current: ActivityStoreState) => ActivityStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ActivityStoreState {
  return state
}

export function useActivityStore(): ActivityStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getActivityState(): ActivityStoreState {
  return state
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Manually logged activity entries
// ---------------------------------------------------------------------------

export interface LogActivityInput {
  activityType: ActivityType
  metOptionId: string
  durationMinutes: number
  date?: string
  notes?: string
  /** The user's current body weight (kg), when known — see resolveBodyWeightKg for the fallback used otherwise. */
  currentWeightKg?: number | null
}

/**
 * Estimates calories at log time from the chosen MET option and the
 * user's current body weight (falling back to a documented population
 * average when no weight is on file yet — see resolveBodyWeightKg), then
 * appends the entry. Never aggregates into another date's record.
 *
 * `intensity` is always derived from the resolved MET option rather than
 * taken as a separate input — the option is the single source of truth
 * for what intensity band it represents, so the two can never disagree.
 */
export function logActivity(input: LogActivityInput): ActivityEntry {
  const option = getMetOption(input.metOptionId)
  const met = option?.met ?? 0
  const intensity: ActivityIntensity = option?.intensity ?? 'moderate'
  const { weightKg } = resolveBodyWeightKg(input.currentWeightKg)
  const newEntry: ActivityEntry = {
    id: nextId('activity'),
    date: input.date ?? getTodayDateString(),
    activityType: input.activityType,
    intensity,
    metOptionId: input.metOptionId,
    durationMinutes: input.durationMinutes,
    estimatedCalories: estimateCaloriesBurned(met, weightKg, input.durationMinutes),
    notes: input.notes,
    createdAt: new Date().toISOString(),
  }
  setState((current) => ({ ...current, entries: [...current.entries, newEntry] }))
  return newEntry
}

export function deleteActivity(id: string): void {
  setState((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== id) }))
}

// ---------------------------------------------------------------------------
// Daily steps — kept independent from manually logged entries so a future
// Health Connect sync can safely replace/merge an imported day's total
// without ever touching or duplicating activity entries above.
// ---------------------------------------------------------------------------

/** Upserts the step total for `date`: replaces any existing record for that date rather than adding a second one. */
export function setStepsForDate(steps: number, date: string = getTodayDateString(), source: DailySteps['source'] = 'manual'): void {
  setState((current) => {
    const existing = current.dailySteps.find((entry) => entry.date === date)
    if (existing) {
      return {
        ...current,
        dailySteps: current.dailySteps.map((entry) =>
          entry.date === date ? { ...entry, steps, source, createdAt: new Date().toISOString() } : entry,
        ),
      }
    }
    const newEntry: DailySteps = { id: nextId('steps'), date, steps, source, createdAt: new Date().toISOString() }
    return { ...current, dailySteps: [...current.dailySteps, newEntry] }
  })
}

/**
 * Wipes all activity data for the current scope back to its clean initial
 * state (used by tests and, in production, the Settings "Reset Fitness
 * Data" action) and notifies subscribers so any mounted UI updates
 * immediately.
 */
export function resetActivityStoreForTests(): void {
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
export const resetActivityData = resetActivityStoreForTests
