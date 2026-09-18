export type HabitCategory = 'hydration' | 'supplements' | 'fitness' | 'nutrition' | 'sleep' | 'wellness' | 'custom'

export const HABIT_CATEGORIES: HabitCategory[] = [
  'hydration',
  'supplements',
  'fitness',
  'nutrition',
  'sleep',
  'wellness',
  'custom',
]

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  hydration: 'Hydration',
  supplements: 'Supplements',
  fitness: 'Fitness',
  nutrition: 'Nutrition',
  sleep: 'Sleep',
  wellness: 'Wellness',
  custom: 'Custom',
}

/**
 * A serializable icon key (never a component reference — Habit is persisted
 * to localStorage as JSON, and React components can't round-trip through
 * `JSON.stringify`). Resolved to an actual icon by data/habitIcons.ts.
 */
export type HabitIconKey =
  | 'droplets'
  | 'pill'
  | 'dumbbell'
  | 'footprints'
  | 'moon'
  | 'beef'
  | 'utensils'
  | 'heart'
  | 'sparkles'
  | 'bell'
  | 'checkCircle'

/**
 * How often a habit or reminder is scheduled. `weekdays` pins it to specific
 * days (0 = Sunday .. 6 = Saturday); `weekly` instead asks for a number of
 * completions anywhere in the week, with no fixed days.
 */
export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'weekly'; timesPerWeek: number }

/**
 * A trackable habit, supplement reminder, or custom reminder — all three
 * share this one shape and one store, distinguished by `category` (and, for
 * reminders, by which fields the UI surfaces). This avoids a second,
 * parallel completion/streak system just for reminders.
 */
export interface Habit {
  id: string
  name: string
  description?: string
  icon: HabitIconKey
  category: HabitCategory
  frequency: HabitSchedule
  /** A descriptive numeric target, e.g. 1 session, 3 (litres), 10000 (steps). Not tied to any other tracker. */
  target: number
  unit?: string
  reminderEnabled: boolean
  /** "HH:MM", 24-hour, only meaningful when `reminderEnabled` is true. */
  reminderTime?: string
  active: boolean
  /** ISO timestamp. */
  createdAt: string
}

/** A distinct name for reminder-oriented UI/vocabulary over the same underlying Habit shape. */
export type Reminder = Habit

/** One completed instance of a habit on a specific day — presence means completed, absence means not. */
export interface HabitEntry {
  id: string
  habitId: string
  /** ISO date string (yyyy-mm-dd). */
  date: string
  /** ISO timestamp. */
  completedAt: string
}

/** Whether a habit was done on a given day (relative to its own schedule) — never "missed" for an unscheduled day. */
export type HabitDayStatus = 'completed' | 'pending' | 'unscheduled' | 'inactive'

export interface HabitStats {
  habitId: string
  currentStreak: number
  bestStreak: number
  /** 0-100, over the analyzed window, counting only scheduled days. */
  completionRate: number
  completedCount: number
  scheduledCount: number
}
