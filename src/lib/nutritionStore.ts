import { useSyncExternalStore } from 'react'
import { mockFoodEntries, mockNutritionGoal, mockWaterGoal, mockWaterLogs } from '@/data/mockFoodEntries'
import {
  pushFoodEntry,
  pushFoodEntryDelete,
  pushNutritionGoal,
  pushWaterGoal,
  pushWaterLog,
  pushWaterLogDelete,
} from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { getCurrentUserId, onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import type { FoodEntry, MacroTotals, MealType, NutritionGoal, WaterGoal, WaterLog } from '@/types/nutrition'
import { getDailyTotals, getEntriesForDate, getLatestWaterLogForDate } from '@/utils/nutrition'
import { getTodayDateString } from '@/utils/dateRange'

const BASE_STORAGE_KEY = 'fitness-os:nutrition-store:v1'

/**
 * Water used to be persisted inside habitStore's own localStorage blob
 * (`fitness-os:habit-store:v1`). It's read here, once, only to migrate an
 * existing user's water history into its new home — habitStore no longer
 * declares these fields at all, so nothing but this migration ever reads
 * this key for water again.
 */
const LEGACY_HABIT_STORE_KEY = 'fitness-os:habit-store:v1'

export interface NutritionStoreState {
  entries: FoodEntry[]
  goal: NutritionGoal
  waterLogs: WaterLog[]
  waterGoal: WaterGoal
}

function createInitialState(): NutritionStoreState {
  if (getCurrentUserId() !== null) {
    return {
      entries: [],
      goal: mockNutritionGoal,
      waterLogs: [],
      waterGoal: mockWaterGoal,
    }
  }
  return {
    entries: mockFoodEntries,
    goal: mockNutritionGoal,
    waterLogs: mockWaterLogs,
    waterGoal: mockWaterGoal,
  }
}

/**
 * One-time recovery of pre-migration water data from habitStore's old
 * localStorage blob — `null` when there's nothing to migrate (a brand new
 * scope, or one that never used water before this domain move).
 */
function migrateLegacyWater(): { waterLogs: WaterLog[]; waterGoal: WaterGoal } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(LEGACY_HABIT_STORE_KEY))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { waterLogs?: WaterLog[]; waterGoal?: WaterGoal }
    if (parsed.waterLogs === undefined && parsed.waterGoal === undefined) return null
    return {
      waterLogs: parsed.waterLogs ?? [],
      waterGoal: parsed.waterGoal ?? mockWaterGoal,
    }
  } catch {
    return null
  }
}

function loadPersistedState(): NutritionStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    const parsed = raw ? (JSON.parse(raw) as Partial<NutritionStoreState>) : null

    // Only attempt migration when this store has never itself persisted a
    // `waterLogs` key — once it has (even as `[]`), that's the real,
    // current source of truth and legacy data must never resurface on top
    // of it (e.g. after the user has since deleted all their water logs).
    const legacyWater = parsed?.waterLogs === undefined ? migrateLegacyWater() : null

    return {
      entries: parsed?.entries ?? initial.entries,
      goal: parsed?.goal ?? initial.goal,
      waterLogs: parsed?.waterLogs ?? legacyWater?.waterLogs ?? initial.waterLogs,
      waterGoal: parsed?.waterGoal ?? legacyWater?.waterGoal ?? initial.waterGoal,
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
// Water actions — append-only, exactly like food entries above: every total
// is derived fresh by exact date-string match (see getDailyWaterMl), never
// carried over from or mutated by another date.
// ---------------------------------------------------------------------------

export function addWaterLog(amountMl: number, date: string = getTodayDateString()): void {
  const newLog: WaterLog = { id: nextId('water'), date, amountMl, createdAt: new Date().toISOString() }
  setState((current) => ({ ...current, waterLogs: [...current.waterLogs, newLog] }))
  void pushWaterLog(newLog)
}

export function removeLatestWaterLog(date: string = getTodayDateString()): void {
  const latest = getLatestWaterLogForDate(state.waterLogs, date)
  setState((current) => {
    if (!latest) return current
    return { ...current, waterLogs: current.waterLogs.filter((log) => log.id !== latest.id) }
  })
  if (latest) void pushWaterLogDelete(latest.id)
}

export function setWaterGoal(goal: Partial<WaterGoal>): void {
  setState((current) => ({ ...current, waterGoal: { ...current.waterGoal, ...goal } }))
  void pushWaterGoal(state.waterGoal)
}

export function getWaterState(): { waterLogs: WaterLog[]; waterGoal: WaterGoal } {
  return { waterLogs: state.waterLogs, waterGoal: state.waterGoal }
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
  waterLogs: WaterLog[]
  waterGoal: WaterGoal | null
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state: cloud
 * entries/logs win on a shared id, any local-only item is kept, and a null
 * cloud goal means "nothing to pull yet." Returns what still needs
 * pushing so a fresh sign-in on this device reconciles both directions.
 * Water logs use the exact same id-based merge as food entries — never a
 * date-based one — so merging can't cross-contaminate two different dates.
 */
export function mergeNutritionFromCloud(cloud: NutritionCloudSnapshot): {
  localOnlyEntries: FoodEntry[]
  goalToPush: NutritionGoal | null
  localOnlyWaterLogs: WaterLog[]
  waterGoalToPush: WaterGoal | null
} {
  const cloudEntryIds = new Set(cloud.entries.map((entry) => entry.id))
  const localOnlyEntries = state.entries.filter((entry) => !cloudEntryIds.has(entry.id))
  const goalToPush = cloud.goal ? null : state.goal

  const cloudWaterLogIds = new Set(cloud.waterLogs.map((log) => log.id))
  const localOnlyWaterLogs = state.waterLogs.filter((log) => !cloudWaterLogIds.has(log.id))
  const waterGoalToPush = cloud.waterGoal ? null : state.waterGoal

  setState((current) => ({
    entries: [...localOnlyEntries, ...cloud.entries],
    goal: cloud.goal ?? current.goal,
    waterLogs: [...localOnlyWaterLogs, ...cloud.waterLogs],
    waterGoal: cloud.waterGoal ?? current.waterGoal,
  }))

  return { localOnlyEntries, goalToPush, localOnlyWaterLogs, waterGoalToPush }
}

/**
 * One-time cleanup for the local-duplicate bug fixed alongside
 * `mapFoodEntryRow` (see mapPersonalRecordRow's doc comment in
 * cloud/mappers.ts for the full mechanism). `serverIds` are raw
 * `food_entries.id` values — never a `client_entry_id` — so a local
 * entry's id can only be a member of that set if it's a leftover pre-fix
 * duplicate. Safe to call on every hydration: a no-op once nothing matches.
 */
export function purgeLegacyServerIdFoodEntries(serverIds: string[]): FoodEntry[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.entries.filter((entry) => serverIdSet.has(entry.id))
  if (removed.length === 0) return []
  setState((current) => ({ ...current, entries: current.entries.filter((entry) => !serverIdSet.has(entry.id)) }))
  return removed
}

/** See `purgeLegacyServerIdFoodEntries` — same mechanism, for water logs. */
export function purgeLegacyServerIdWaterLogs(serverIds: string[]): WaterLog[] {
  if (serverIds.length === 0) return []
  const serverIdSet = new Set(serverIds)
  const removed = state.waterLogs.filter((log) => serverIdSet.has(log.id))
  if (removed.length === 0) return []
  setState((current) => ({ ...current, waterLogs: current.waterLogs.filter((log) => !serverIdSet.has(log.id)) }))
  return removed
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
