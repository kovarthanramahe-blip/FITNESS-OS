import type { Habit, HabitEntry } from '@/types/habits'
import type { FoodEntry, WaterLog } from '@/types/nutrition'
import type { WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry } from '@/types/workout'
import { toDateString } from '@/utils/dateRange'
import { isHabitCompletedOn, isHabitScheduledOn } from '@/utils/habits'
import { getDailyTotals, getDailyWaterMl } from '@/utils/nutrition'

/**
 * Everything the Progress Calendar derives its day indicators from — all of
 * it is existing store state, read once per render. No calendar-specific
 * store, persistence, or duplicate records exist; this only re-derives from
 * data the app already owns.
 */
export interface CalendarDataSources {
  workoutHistory: WorkoutHistoryEntry[]
  weightLogs: WeightLog[]
  foodEntries: FoodEntry[]
  waterLogs: WaterLog[]
  habits: Habit[]
  habitEntries: HabitEntry[]
}

export interface CalendarHabitsActivity {
  completed: number
  scheduled: number
}

export interface CalendarNutritionActivity {
  calories: number
  protein: number
}

export interface CalendarDayActivity {
  date: string
  workout: boolean
  weightKg: number | null
  nutrition: CalendarNutritionActivity | null
  waterMl: number | null
  habits: CalendarHabitsActivity | null
  hasActivity: boolean
}

/**
 * Derives what happened on `dateStr` from the existing stores — pure and
 * deterministic (same inputs, same output), so it needs no store subscription
 * of its own and is trivial to test. `WorkoutHistoryEntry.date` is a full ISO
 * timestamp (workouts are logged with a time), so it's compared by local
 * calendar day; the other stores already key their entries by a yyyy-mm-dd
 * date-only string, so those compare directly.
 */
export function getCalendarDayActivity(dateStr: string, sources: CalendarDataSources): CalendarDayActivity {
  const workout = sources.workoutHistory.some((entry) => toDateString(new Date(entry.date)) === dateStr)

  const weightLog = sources.weightLogs.find((log) => log.date === dateStr)
  const weightKg = weightLog ? weightLog.weightKg : null

  const dayFoodEntries = sources.foodEntries.filter((entry) => entry.date === dateStr)
  let nutrition: CalendarNutritionActivity | null = null
  if (dayFoodEntries.length > 0) {
    const totals = getDailyTotals(sources.foodEntries, dateStr)
    nutrition = { calories: Math.round(totals.calories), protein: totals.protein }
  }

  const totalWaterMl = getDailyWaterMl(sources.waterLogs, dateStr)
  const waterMl = totalWaterMl > 0 ? totalWaterMl : null

  const scheduledHabits = sources.habits.filter((habit) => habit.active && isHabitScheduledOn(habit.frequency, dateStr))
  const completedHabitCount = scheduledHabits.filter((habit) => isHabitCompletedOn(sources.habitEntries, habit.id, dateStr)).length
  const habits = completedHabitCount > 0 ? { completed: completedHabitCount, scheduled: scheduledHabits.length } : null

  return {
    date: dateStr,
    workout,
    weightKg,
    nutrition,
    waterMl,
    habits,
    hasActivity: workout || weightKg !== null || nutrition !== null || waterMl !== null || habits !== null,
  }
}

export interface CalendarGridDay {
  date: string
  dayOfMonth: number
  inCurrentMonth: boolean
}

/**
 * A Sunday-first calendar grid for `month` (0-indexed) of `year`, padded with
 * the trailing days of the previous month and the leading days of the next
 * so every row has exactly 7 columns and day 1 lands under its true weekday.
 * Pure function of (year, month) — no "now" dependency, so it's trivial to
 * test against fixed month/year boundaries.
 */
export function getCalendarMonthGrid(year: number, month: number): CalendarGridDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const days: CalendarGridDay[] = []

  for (let offset = firstWeekday - 1; offset >= 0; offset--) {
    const date = new Date(year, month, -offset)
    days.push({ date: toDateString(date), dayOfMonth: date.getDate(), inCurrentMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ date: toDateString(new Date(year, month, day)), dayOfMonth: day, inCurrentMonth: true })
  }

  const trailingDays = (7 - (days.length % 7)) % 7
  for (let day = 1; day <= trailingDays; day++) {
    days.push({ date: toDateString(new Date(year, month + 1, day)), dayOfMonth: day, inCurrentMonth: false })
  }

  return days
}
