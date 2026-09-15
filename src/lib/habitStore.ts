import { useSyncExternalStore } from 'react'
import { mockHabitEntries, mockHabits, mockWaterGoal, mockWaterLogs } from '@/data/mockHabits'
import type { Habit, HabitEntry, HabitIconKey, HabitSchedule, WaterGoal, WaterLog } from '@/types/habits'
import { getTodayDateString } from '@/utils/dateRange'
import { getLatestWaterLogForDate } from '@/utils/habits'

const STORAGE_KEY = 'fitness-os:habit-store:v1'

export interface HabitStoreState {
  habits: Habit[]
  entries: HabitEntry[]
  waterLogs: WaterLog[]
  waterGoal: WaterGoal
}

function createInitialState(): HabitStoreState {
  return {
    habits: mockHabits,
    entries: mockHabitEntries,
    waterLogs: mockWaterLogs,
    waterGoal: mockWaterGoal,
  }
}

function loadPersistedState(): HabitStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<HabitStoreState>
    return {
      habits: parsed.habits ?? initial.habits,
      entries: parsed.entries ?? initial.entries,
      waterLogs: parsed.waterLogs ?? initial.waterLogs,
      waterGoal: parsed.waterGoal ?? initial.waterGoal,
    }
  } catch {
    return initial
  }
}

function persist(state: HabitStoreState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can fail (quota, private mode) — the session still works in-memory.
  }
}

let state: HabitStoreState = loadPersistedState()
const listeners = new Set<() => void>()

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
  setState((current) => ({
    ...current,
    habits: [...current.habits, { id: nextId('habit'), createdAt: new Date().toISOString(), ...input }],
  }))
}

/** Never touches `entries` — editing a habit's definition never rewrites its completion history. */
export function editHabit(id: string, patch: Partial<HabitInput>): void {
  setState((current) => ({
    ...current,
    habits: current.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
  }))
}

export function deleteHabit(id: string): void {
  setState((current) => ({
    ...current,
    habits: current.habits.filter((habit) => habit.id !== id),
    entries: current.entries.filter((entry) => entry.habitId !== id),
  }))
}

export function toggleHabitActive(id: string): void {
  setState((current) => ({
    ...current,
    habits: current.habits.map((habit) => (habit.id === id ? { ...habit, active: !habit.active } : habit)),
  }))
}

// ---------------------------------------------------------------------------
// Completion — date-specific, stored as independent entries so editing a
// habit's definition never overwrites past completion data.
// ---------------------------------------------------------------------------

export function completeHabit(habitId: string, date: string = getTodayDateString()): void {
  setState((current) => {
    const alreadyDone = current.entries.some((entry) => entry.habitId === habitId && entry.date === date)
    if (alreadyDone) return current
    return {
      ...current,
      entries: [...current.entries, { id: nextId('entry'), habitId, date, completedAt: new Date().toISOString() }],
    }
  })
}

export function uncompleteHabit(habitId: string, date: string = getTodayDateString()): void {
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => !(entry.habitId === habitId && entry.date === date)),
  }))
}

/** Active habits as of `date` — callers derive each one's day status via getHabitStatusForDate. */
export function getHabitsForDate(date: string): Habit[] {
  return state.habits.filter((habit) => habit.active && habit.createdAt.slice(0, 10) <= date)
}

export function getHabitHistory(habitId: string): HabitEntry[] {
  return state.entries.filter((entry) => entry.habitId === habitId)
}

// ---------------------------------------------------------------------------
// Water actions
// ---------------------------------------------------------------------------

export function addWaterLog(amountMl: number, date: string = getTodayDateString()): void {
  setState((current) => ({
    ...current,
    waterLogs: [...current.waterLogs, { id: nextId('water'), date, amountMl, createdAt: new Date().toISOString() }],
  }))
}

export function removeLatestWaterLog(date: string = getTodayDateString()): void {
  setState((current) => {
    const latest = getLatestWaterLogForDate(current.waterLogs, date)
    if (!latest) return current
    return { ...current, waterLogs: current.waterLogs.filter((log) => log.id !== latest.id) }
  })
}

export function setWaterGoal(goal: Partial<WaterGoal>): void {
  setState((current) => ({ ...current, waterGoal: { ...current.waterGoal, ...goal } }))
}

/** Test-only: resets the module-level store to a clean initial state. */
export function resetHabitStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
