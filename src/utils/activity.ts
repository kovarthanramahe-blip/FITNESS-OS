import type { TimeRange } from '@/types/shared'
import type { ActivityEntry, ActivityHistory, DailySteps } from '@/types/activity'
import { filterByRange } from '@/utils/dateRange'

/**
 * Used only when no current body weight is available at all (a brand-new
 * user with no Progress weight log yet). It's a rough population-average
 * adult weight, never a substitute for the user's own data once they have
 * any — see `resolveBodyWeightKg`, whose `isEstimate` flag callers must
 * surface (e.g. "Estimated calories" wording) whenever this was used.
 */
export const FALLBACK_BODY_WEIGHT_KG = 70

/**
 * kcal/min = MET × bodyWeightKg × 3.5 / 200 — the standard MET-based
 * energy expenditure formula. Never a single hard-coded calories-per-minute
 * constant: every caller supplies the specific MET value for the activity
 * and intensity actually logged (see data/activityCatalogue.ts).
 */
export function estimateCaloriesBurned(met: number, bodyWeightKg: number, durationMinutes: number): number {
  const kcalPerMinute = (met * bodyWeightKg * 3.5) / 200
  return Math.max(Math.round(kcalPerMinute * durationMinutes), 0)
}

/**
 * Resolves the body weight to use for a calorie estimate: the user's most
 * recent logged weight when one exists, otherwise the documented fallback
 * above. `isEstimate` tells the caller whether the *result* should be
 * presented as a rougher estimate than usual (calories are always labeled
 * "Estimated calories" either way — this only distinguishes "estimated
 * from your real weight" from "estimated from a population-average guess").
 */
export function resolveBodyWeightKg(currentWeightKg: number | null | undefined): { weightKg: number; isEstimate: boolean } {
  if (typeof currentWeightKg === 'number' && currentWeightKg > 0) {
    return { weightKg: currentWeightKg, isEstimate: false }
  }
  return { weightKg: FALLBACK_BODY_WEIGHT_KG, isEstimate: true }
}

/** Activities logged for an exact calendar date — never a range match. */
export function getActivitiesForDate(entries: ActivityEntry[], date: string): ActivityEntry[] {
  return entries.filter((entry) => entry.date === date)
}

export interface DailyActivitySummary {
  activityCount: number
  totalDurationMinutes: number
  totalEstimatedCalories: number
}

/** Always derived fresh from `entries` for the given date — never stored directly. */
export function getDailyActivitySummary(entries: ActivityEntry[], date: string): DailyActivitySummary {
  const dayEntries = getActivitiesForDate(entries, date)
  return {
    activityCount: dayEntries.length,
    totalDurationMinutes: dayEntries.reduce((total, entry) => total + entry.durationMinutes, 0),
    totalEstimatedCalories: dayEntries.reduce((total, entry) => total + entry.estimatedCalories, 0),
  }
}

/**
 * Grouped by exact date, ascending — the same "group logs by their own
 * date field, never interpolate gaps" shape as getNutritionHistory /
 * getWaterHistory in utils/nutrition.ts.
 */
export function getActivityHistory(entries: ActivityEntry[], range: TimeRange, now: Date = new Date()): ActivityHistory {
  const inRange = filterByRange(entries, (entry) => entry.date, range, now)
  const byDate = new Map<string, ActivityEntry[]>()
  for (const entry of inRange) {
    const list = byDate.get(entry.date) ?? []
    list.push(entry)
    byDate.set(entry.date, list)
  }

  return [...byDate.entries()]
    .map(([date, dayEntries]) => ({
      date,
      activityCount: dayEntries.length,
      totalDurationMinutes: dayEntries.reduce((total, entry) => total + entry.durationMinutes, 0),
      totalEstimatedCalories: dayEntries.reduce((total, entry) => total + entry.estimatedCalories, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The step count for an exact calendar date — 0 when nothing was recorded, never negative. */
export function getStepsForDate(steps: DailySteps[], date: string): number {
  const entry = steps.find((s) => s.date === date)
  return entry ? Math.max(entry.steps, 0) : 0
}

export interface StepsHistoryPoint {
  date: string
  steps: number
}

/** Date-ascending step history within `range` — one point per recorded date, gaps left out rather than filled with 0. */
export function getStepsHistory(steps: DailySteps[], range: TimeRange, now: Date = new Date()): StepsHistoryPoint[] {
  const inRange = filterByRange(steps, (entry) => entry.date, range, now)
  return [...inRange]
    .map((entry) => ({ date: entry.date, steps: Math.max(entry.steps, 0) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
