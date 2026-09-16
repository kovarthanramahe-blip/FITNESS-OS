import { useSyncExternalStore } from 'react'
import { mockFoodEntries, mockNutritionGoal } from '@/data/mockFoodEntries'
import { pushFoodEntry, pushFoodEntryDelete, pushNutritionGoal } from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import type { FoodEntry, MacroTotals, MealType, NutritionGoal } from '@/types/nutrition'
import { getDailyTotals, getEntriesForDate } from '@/utils/nutrition'

const BASE_STORAGE_KEY = 'fitness-os:nutrition-store:v1'

export interface NutritionStoreState {
  entries: FoodEntry[]
  goal: NutritionGoal
}

function createInitialState(): NutritionStoreState {
  if (getCurrentUserId() !== null) {
    return {
      entries: [],
      goal: mockNutritionGoal,
    }
  }
  return {
    entries: mockFoodEntries,
    goal: mockNutritionGoal,
  }
}

function loadPersistedState(): NutritionStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
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
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), state)
}

let state: NutritionStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

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
  const newEntry: FoodEntry = { id: nextId('food'), createdAt: new Date().toISOString(), ...input }
  setState((current) => ({ ...current, entries: [...current.entries, newEntry] }))
  void pushFoodEntry(newEntry)
}

export function editFoodEntry(id: string, patch: Partial<FoodEntryInput>): void {
  setState((current) => ({
    ...current,
    entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  }))
  const updated = state.entries.find((entry) => entry.id === id)
  if (updated) void pushFoodEntry(updated)
}

export function deleteFoodEntry(id: string): void {
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => entry.id !== id),
  }))
  void pushFoodEntryDelete(id)
}

export function clearDailyEntries(date: string): void {
  const removedIds = state.entries.filter((entry) => entry.date === date).map((entry) => entry.id)
  setState((current) => ({
    ...current,
    entries: current.entries.filter((entry) => entry.date !== date),
  }))
  for (const id of removedIds) void pushFoodEntryDelete(id)
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
  void pushNutritionGoal(state.goal)
}

export function getNutritionGoals(): NutritionGoal {
  return state.goal
}

export interface NutritionCloudSnapshot {
  entries: FoodEntry[]
  goal: NutritionGoal | null
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state: cloud
 * entries win on a shared id, any local-only entry is kept, and a null
 * cloud goal means "nothing to pull yet." Returns what still needs
 * pushing so a fresh sign-in on this device reconciles both directions.
 */
export function mergeNutritionFromCloud(cloud: NutritionCloudSnapshot): { localOnlyEntries: FoodEntry[]; goalToPush: NutritionGoal | null } {
  const cloudEntryIds = new Set(cloud.entries.map((entry) => entry.id))
  const localOnlyEntries = state.entries.filter((entry) => !cloudEntryIds.has(entry.id))
  const goalToPush = cloud.goal ? null : state.goal

  setState((current) => ({
    entries: [...localOnlyEntries, ...cloud.entries],
    goal: cloud.goal ?? current.goal,
  }))

  return { localOnlyEntries, goalToPush }
}

/**
 * Wipes all nutrition data for the current scope back to its clean initial
 * state (used by both tests and the production "Reset Fitness Data"
 * setting) and notifies subscribers so any mounted UI updates immediately.
 */
export function resetNutritionStoreForTests(): void {
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
export const resetNutritionData = resetNutritionStoreForTests
