import { useSyncExternalStore } from 'react'
import { mockFoodEntries, mockNutritionGoal } from '@/data/mockFoodEntries'
import type { FoodEntry, MacroTotals, MealType, NutritionGoal } from '@/types/nutrition'
import { getDailyTotals, getEntriesForDate } from '@/utils/nutrition'

const STORAGE_KEY = 'fitness-os:nutrition-store:v1'

export interface NutritionStoreState {
  entries: FoodEntry[]
  goal: NutritionGoal
}

function createInitialState(): NutritionStoreState {
  return {
    entries: mockFoodEntries,
    goal: mockNutritionGoal,
  }
}

function loadPersistedState(): NutritionStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<NutritionStoreState>
    return {
      entries: parsed.entries ?? initial.entries,
      goal: parsed.goal ?? initial.goal,
    }
  } catch {
    return initial
  }
}

function persist(state: NutritionStoreState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can fail (quota, private mode) — the session still works in-memory.
  }
}

let state: NutritionStoreState = loadPersistedState()
const listeners = new Set<() => void>()

function setState(updater: (current: NutritionStoreState) => NutritionStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): NutritionStoreState {
  return state
}

export function useNutritionStore(): NutritionStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getNutritionState(): NutritionStoreState {
  return state
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Food entry actions
// ---------------------------------------------------------------------------

export interface FoodEntryInput {
  foodId: string
  foodName: string
  meal: MealType
  quantity: number
  servingUnit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  date: string
}

export function addFoodEntry(input: FoodEntryInput): void {
  setState((current) => ({
    ...current,
    entries: [...current.entries, { id: nextId('food'), createdAt: new Date().toISOString(), ...input }],
  }))
}

export function editFoodEntry(id: string, patch: Partial<FoodEntryInput>): void {
  setState((current) => ({
    ...current,
    entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  }))
}

export function deleteFoodEntry(id: string): void {
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => entry.id !== id),
  }))
}

export function clearDailyEntries(date: string): void {
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => entry.date !== date),
  }))
}

/** Entries logged for a given date — a thin, always-current view over `entries`. */
export function getEntriesForDateFromStore(date: string): FoodEntry[] {
  return getEntriesForDate(state.entries, date)
}

/** Daily macro totals, derived from entries — never a separately stored value. */
export function getDailyTotalsFromStore(date: string): MacroTotals {
  return getDailyTotals(state.entries, date)
}

// ---------------------------------------------------------------------------
// Goal actions
// ---------------------------------------------------------------------------

export function setNutritionGoals(goal: Partial<NutritionGoal>): void {
  setState((current) => ({ ...current, goal: { ...current.goal, ...goal } }))
}

export function getNutritionGoals(): NutritionGoal {
  return state.goal
}

/** Test-only: resets the module-level store to a clean initial state. */
export function resetNutritionStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
