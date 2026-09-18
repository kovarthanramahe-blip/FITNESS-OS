/**
 * "Activity" is the new first-class area under Workout that covers
 * cardio/movement tracking distinct from strength training: manually
 * logged sessions (a run, a swim, a match) plus daily step counts. Its
 * architecture deliberately mirrors Nutrition's date-specific model (see
 * types/nutrition.ts's water types) — every record is keyed by an exact
 * calendar date, never aggregated across dates, so future Health Connect
 * sync can safely add its own records alongside these without touching
 * manually-logged ones.
 */

/**
 * Manually loggable activity types. Steps are intentionally excluded here
 * — they're tracked as a raw daily count via `DailySteps` below, not as a
 * duration+intensity session, so a future Health Connect step import can
 * never collide with a manually logged "walking" or "running" entry.
 */
export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'hiking'
  | 'badminton'
  | 'swimming'
  | 'basketball'
  | 'football'
  | 'calisthenics'
  | 'other'

/**
 * A broad, UI-facing effort band. The actual calorie estimate never uses
 * this directly — it looks up the specific MET catalogue entry (see
 * data/activityCatalogue.ts) the user picked, which is more granular than
 * these three buckets (e.g. walking has three speed bands, all mapped
 * across light/moderate/vigorous).
 */
export type ActivityIntensity = 'light' | 'moderate' | 'vigorous'

export interface ActivityEntry {
  /** Stable, client-generated — never re-derived or reused across edits. */
  id: string
  /** yyyy-mm-dd, local-date-safe — see utils/dateRange.ts. Never a full ISO timestamp. */
  date: string
  activityType: ActivityType
  intensity: ActivityIntensity
  /** Which catalogue entry (data/activityCatalogue.ts) supplied the MET value used for this entry's estimate. */
  metOptionId: string
  durationMinutes: number
  /** Always MET-derived at log time (see utils/activity.ts) — an estimate, never stored as if precise. */
  estimatedCalories: number
  notes?: string
  createdAt: string
}

/**
 * A single day's step count. Kept as its own record — never merged into
 * `ActivityEntry` — so a future Health Connect sync can overwrite or
 * merge imported totals for a date without ever touching or duplicating
 * a manually logged activity for that same day.
 */
export interface DailySteps {
  id: string
  date: string
  steps: number
  /** `manual` today; `health-connect` is reserved for the future sync path this architecture is built for. */
  source: 'manual' | 'health-connect'
  createdAt: string
}

export interface ActivityHistoryPoint {
  date: string
  activityCount: number
  totalDurationMinutes: number
  totalEstimatedCalories: number
}

/** A date-ascending series of daily activity totals — the shape charts/lists consume. */
export type ActivityHistory = ActivityHistoryPoint[]
