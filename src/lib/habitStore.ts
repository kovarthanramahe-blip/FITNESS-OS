import { useSyncExternalStore } from 'react'
import { mockHabitEntries, mockHabits } from '@/data/mockHabits'
import { pushHabit, pushHabitDelete, pushHabitEntry, pushHabitEntryDelete } from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import type { Habit, HabitEntry, HabitIconKey, HabitSchedule } from '@/types/habits'
import { getTodayDateString } from '@/utils/dateRange'

const BASE_STORAGE_KEY = 'fitness-os:habit-store:v1'

export interface HabitStoreState {
  habits: Habit[]
  entries: HabitEntry[]
}

function createInitialState(): HabitStoreState {
  if (getCurrentUserId() !== null) {
    return {
      habits: [],
      entries: [],
    }
  }
  return {
    habits: mockHabits,
    entries: mockHabitEntries,
  }
}

function loadPersistedState(): HabitStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<HabitStoreState>
    return {
      habits: parsed.habits ?? initial.habits,
      entries: parsed.entries ?? initial.entries,
    }
  } catch {
    return initial
  }
}

function persist(state: HabitStoreState): void {
  if (typeof window === 'undefined') return
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), state)
}

let state: HabitStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

function setState(updater: (current: HabitStoreState) => HabitStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): HabitStoreState {
  return state
}

export function useHabitStore(): HabitStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getHabitState(): HabitStoreState {
  return state
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Habit / reminder actions — the same CRUD serves both, since a "reminder"
// is just a Habit tagged with a `supplements` or `custom` category.
// ---------------------------------------------------------------------------

export interface HabitInput {
  name: string
  description?: string
  icon: HabitIconKey
  category: Habit['category']
  frequency: HabitSchedule
  target: number
  unit?: string
  reminderEnabled: boolean
  reminderTime?: string
  active: boolean
}

export function addHabit(input: HabitInput): void {
  const newHabit: Habit = { id: nextId('habit'), createdAt: new Date().toISOString(), ...input }
  setState((current) => ({ ...current, habits: [...current.habits, newHabit] }))
  void pushHabit(newHabit)
}

/** Never touches `entries` — editing a habit's definition never rewrites its completion history. */
export function editHabit(id: string, patch: Partial<HabitInput>): void {
  setState((current) => ({
    ...current,
    habits: current.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
  }))
  const updated = state.habits.find((habit) => habit.id === id)
  if (updated) void pushHabit(updated)
}

export function deleteHabit(id: string): void {
  setState((current) => ({
    ...current,
    habits: current.habits.filter((habit) => habit.id !== id),
    entries: current.entries.filter((entry) => entry.habitId !== id),
  }))
  void pushHabitDelete(id)
}

export function toggleHabitActive(id: string): void {
  setState((current) => ({
    ...current,
    habits: current.habits.map((habit) => (habit.id === id ? { ...habit, active: !habit.active } : habit)),
  }))
  const updated = state.habits.find((habit) => habit.id === id)
  if (updated) void pushHabit(updated)
}

// ---------------------------------------------------------------------------
// Completion — date-specific, stored as independent entries so editing a
// habit's definition never overwrites past completion data.
// ---------------------------------------------------------------------------

export function completeHabit(habitId: string, date: string = getTodayDateString()): void {
  const newEntry: HabitEntry = { id: nextId('entry'), habitId, date, completedAt: new Date().toISOString() }
  let added = false
  setState((current) => {
    const alreadyDone = current.entries.some((entry) => entry.habitId === habitId && entry.date === date)
    if (alreadyDone) return current
    added = true
    return { ...current, entries: [...current.entries, newEntry] }
  })
  const habit = state.habits.find((h) => h.id === habitId)
  if (added && habit) void pushHabitEntry(newEntry, habit)
}

export function uncompleteHabit(habitId: string, date: string = getTodayDateString()): void {
  const removed = state.entries.find((entry) => entry.habitId === habitId && entry.date === date)
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => !(entry.habitId === habitId && entry.date === date)),
  }))
  if (removed) void pushHabitEntryDelete(removed.id)
}

/** Active habits as of `date` — callers derive each one's day status via getHabitStatusForDate. */
export function getHabitsForDate(date: string): Habit[] {
  return state.habits.filter((habit) => habit.active && habit.createdAt.slice(0, 10) <= date)
}

export function getHabitHistory(habitId: string): HabitEntry[] {
  return state.entries.filter((entry) => entry.habitId === habitId)
}

export interface HabitCloudSnapshot {
  habits: Habit[]
  entries: HabitEntry[]
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state: cloud
 * items win on a shared id, any local-only item is kept. Returns what
 * still needs pushing so a fresh sign-in on this device reconciles both
 * directions — `localOnlyEntries` is paired with its owning habit (falling
 * back to the merged habit list) since a cloud push needs the full `Habit`
 * to resolve the entry's server-side foreign key.
 */
export function mergeHabitFromCloud(cloud: HabitCloudSnapshot): {
  localOnlyHabits: Habit[]
  localOnlyEntries: { entry: HabitEntry; habit: Habit }[]
} {
  const cloudHabitIds = new Set(cloud.habits.map((habit) => habit.id))
  const localOnlyHabits = state.habits.filter((habit) => !cloudHabitIds.has(habit.id))
  const mergedHabits = [...localOnlyHabits, ...cloud.habits]
  const habitsById = new Map(mergedHabits.map((habit) => [habit.id, habit]))

  const cloudEntryIds = new Set(cloud.entries.map((entry) => entry.id))
  const localOnlyEntries = state.entries
    .filter((entry) => !cloudEntryIds.has(entry.id))
    .flatMap((entry) => {
      const habit = habitsById.get(entry.habitId)
      return habit ? [{ entry, habit }] : []
    })

  setState(() => ({
    habits: mergedHabits,
    entries: [...localOnlyEntries.map((item) => item.entry), ...cloud.entries],
  }))

  return { localOnlyHabits, localOnlyEntries }
}

/**
 * One-time cleanup for the local-duplicate bug fixed alongside
 * `mapHabitRow` (see mapPersonalRecordRow's doc comment in
 * cloud/mappers.ts for the full mechanism). `serverIds` are raw
 * `habits.id` values — never a `client_habit_id` — so a local habit's id
 * can only be a member of that set if it's a leftover pre-fix duplicate.
 * Safe to call on every hydration: a no-op once nothing matches.
 */
export function purgeLegacyServerIdHabits(serverIds: string[]): Habit[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.habits.filter((habit) => serverIdSet.has(habit.id))
  if (removed.length === 0) return []
  setState((current) => ({ ...current, habits: current.habits.filter((habit) => !serverIdSet.has(habit.id)) }))
  return removed
}

/**
 * See `purgeLegacyServerIdHabits` — same mechanism for habit entries,
 * `entryServerIds` being raw `habit_entries.id` values. Also repairs a
 * second, distinct artifact of the same pre-fix bug: the old
 * `mapHabitEntryRow` set a hydrated entry's `habitId` to the *habit's* raw
 * server id (its foreign key) instead of the habit's client id, so a
 * surviving entry can still point at a habit id that's about to be purged
 * by `purgeLegacyServerIdHabits`. `habitServerIdToClientId` (from
 * `getHabitServerIdToClientId`) re-points any entry whose `habitId` is
 * still one of those legacy server habit ids back to the canonical client
 * habit id — an entry whose `habitId` is already a client id (the normal,
 * post-fix case) is never touched, since it won't be a key in that map.
 */
export function purgeLegacyServerIdHabitEntries(
  entryServerIds: string[],
  habitServerIdToClientId: Record<string, string>,
): HabitEntry[] {
  const entryServerIdSet = new Set(entryServerIds)
  const hasHabitIdRepoints = Object.keys(habitServerIdToClientId).length > 0
  if (entryServerIdSet.size === 0 && !hasHabitIdRepoints) return []

  const removed = state.entries.filter((entry) => entryServerIdSet.has(entry.id))
  const needsRepoint = state.entries.some(
    (entry) => !entryServerIdSet.has(entry.id) && habitServerIdToClientId[entry.habitId] !== undefined,
  )
  if (removed.length === 0 && !needsRepoint) return []

  setState((current) => ({
    ...current,
    entries: current.entries
      .filter((entry) => !entryServerIdSet.has(entry.id))
      .map((entry) => {
        const canonicalHabitId = habitServerIdToClientId[entry.habitId]
        return canonicalHabitId ? { ...entry, habitId: canonicalHabitId } : entry
      }),
  }))
  return removed
}

/**
 * Wipes all habit data for the current scope back to its clean initial
 * state (used by both tests and the production "Reset Fitness Data"
 * setting) and notifies subscribers so any mounted UI updates immediately.
 */
export function resetHabitStoreForTests(): void {
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
export const resetHabitData = resetHabitStoreForTests
