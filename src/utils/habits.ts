import type { Habit, HabitDayStatus, HabitEntry, HabitSchedule, HabitStats, WaterLog } from '@/types/habits'
import { addDaysToDateString, getDayOfWeek, getTodayDateString, isWithinRange } from '@/utils/dateRange'
import type { TimeRange } from '@/types/shared'
import { clamp } from '@/utils/format'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

// ---------------------------------------------------------------------------
// Schedule matching — the single place that decides whether a habit is
// "on" for a given day. Everything else (status, streaks, completion rate)
// is built on top of this, so a rest/unscheduled day is never treated as a
// failure anywhere in the app.
// ---------------------------------------------------------------------------

/** For `weekly` schedules, every day is a candidate — completion is judged over the whole week, not a fixed day. */
export function isHabitScheduledOn(schedule: HabitSchedule, dateStr: string): boolean {
  if (schedule.type === 'daily') return true
  if (schedule.type === 'weekly') return true
  return schedule.days.includes(getDayOfWeek(dateStr))
}

function getMonday(dateStr: string): string {
  const day = getDayOfWeek(dateStr)
  const diff = day === 0 ? -6 : 1 - day
  return addDaysToDateString(dateStr, diff)
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export function getEntriesForHabit(entries: HabitEntry[], habitId: string): HabitEntry[] {
  return entries.filter((entry) => entry.habitId === habitId)
}

export function isHabitCompletedOn(entries: HabitEntry[], habitId: string, dateStr: string): boolean {
  return entries.some((entry) => entry.habitId === habitId && entry.date === dateStr)
}

/**
 * The day-level status shown in the UI. `inactive` (the habit itself is
 * turned off) always wins; otherwise an unscheduled day is `unscheduled`,
 * never a missed/failed day.
 */
export function getHabitStatusForDate(habit: Habit, entries: HabitEntry[], dateStr: string): HabitDayStatus {
  if (!habit.active) return 'inactive'
  if (!isHabitScheduledOn(habit.frequency, dateStr)) return 'unscheduled'
  return isHabitCompletedOn(entries, habit.id, dateStr) ? 'completed' : 'pending'
}

export interface TodaysHabitsSummary {
  completed: number
  scheduled: number
  percent: number
  bestCurrentStreak: number
}

/** Only active, scheduled-today habits count toward the denominator — an unscheduled habit is never a missed one. */
export function getTodaysHabitsSummary(habits: Habit[], entries: HabitEntry[], now: Date = new Date()): TodaysHabitsSummary {
  const today = getTodayDateString(now)
  const scheduledToday = habits.filter((habit) => habit.active && isHabitScheduledOn(habit.frequency, today))
  const completed = scheduledToday.filter((habit) => isHabitCompletedOn(entries, habit.id, today)).length
  const percent = scheduledToday.length === 0 ? 0 : round1((completed / scheduledToday.length) * 100)
  const bestCurrentStreak = habits
    .filter((habit) => habit.active)
    .reduce((best, habit) => Math.max(best, getCurrentStreak(habit, entries, now)), 0)

  return { completed, scheduled: scheduledToday.length, percent, bestCurrentStreak }
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

function countCompletionsInWeek(entries: HabitEntry[], habitId: string, mondayStr: string): number {
  const sundayStr = addDaysToDateString(mondayStr, 6)
  return getEntriesForHabit(entries, habitId).filter((entry) => entry.date >= mondayStr && entry.date <= sundayStr).length
}

function getCurrentWeeklyTargetStreak(habit: Habit, entries: HabitEntry[], todayStr: string): number {
  if (habit.frequency.type !== 'weekly') return 0
  const timesPerWeek = habit.frequency.timesPerWeek

  let cursor = getMonday(todayStr)
  // The current week may still be in progress — skip it without breaking the
  // streak if it hasn't hit target yet, same treatment as an incomplete "today".
  if (countCompletionsInWeek(entries, habit.id, cursor) < timesPerWeek) {
    cursor = addDaysToDateString(cursor, -7)
  }

  let streak = 0
  while (countCompletionsInWeek(entries, habit.id, cursor) >= timesPerWeek) {
    streak += 1
    cursor = addDaysToDateString(cursor, -7)
  }
  return streak
}

/**
 * Consecutive scheduled days completed, walking back from today.
 * Unscheduled days are skipped (never break the streak); an incomplete
 * *today* doesn't zero out an otherwise-intact streak, since the day isn't
 * over yet — it just isn't counted until completed.
 */
export function getCurrentStreak(habit: Habit, entries: HabitEntry[], now: Date = new Date()): number {
  const todayStr = getTodayDateString(now)
  if (habit.frequency.type === 'weekly') return getCurrentWeeklyTargetStreak(habit, entries, todayStr)

  const earliestBound = habit.createdAt.slice(0, 10)
  let cursor = todayStr
  if (isHabitScheduledOn(habit.frequency, cursor) && !isHabitCompletedOn(entries, habit.id, cursor)) {
    cursor = addDaysToDateString(cursor, -1)
  }

  let streak = 0
  while (cursor >= earliestBound) {
    if (isHabitScheduledOn(habit.frequency, cursor)) {
      if (isHabitCompletedOn(entries, habit.id, cursor)) {
        streak += 1
      } else {
        break
      }
    }
    cursor = addDaysToDateString(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive scheduled-and-completed days across all recorded history. */
export function getBestStreak(habit: Habit, entries: HabitEntry[], now: Date = new Date()): number {
  const habitEntries = getEntriesForHabit(entries, habit.id)
  if (habit.frequency.type === 'weekly') {
    if (habitEntries.length === 0) return 0
    const timesPerWeek = habit.frequency.timesPerWeek
    const earliestWeek = getMonday(habitEntries.reduce((min, e) => (e.date < min ? e.date : min), habitEntries[0]!.date))
    const todayStr = getTodayDateString(now)

    let best = 0
    let current = 0
    let cursor = earliestWeek
    while (cursor <= todayStr) {
      if (countCompletionsInWeek(entries, habit.id, cursor) >= timesPerWeek) {
        current += 1
        best = Math.max(best, current)
      } else {
        current = 0
      }
      cursor = addDaysToDateString(cursor, 7)
    }
    return best
  }

  if (habitEntries.length === 0) return 0
  const earliest = habitEntries.reduce((min, e) => (e.date < min ? e.date : min), habitEntries[0]!.date)
  const todayStr = getTodayDateString(now)

  let best = 0
  let current = 0
  let cursor = earliest < habit.createdAt.slice(0, 10) ? earliest : habit.createdAt.slice(0, 10)
  while (cursor <= todayStr) {
    if (isHabitScheduledOn(habit.frequency, cursor)) {
      if (isHabitCompletedOn(entries, habit.id, cursor)) {
        current += 1
        best = Math.max(best, current)
      } else {
        current = 0
      }
    }
    cursor = addDaysToDateString(cursor, 1)
  }
  return best
}

// ---------------------------------------------------------------------------
// Completion rate / stats
// ---------------------------------------------------------------------------

const RANGE_DAYS: Record<Exclude<TimeRange, 'ALL'>, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

/** 0-100, counting only days the habit was actually scheduled — an unscheduled day never drags the rate down. */
export function getCompletionRate(habit: Habit, entries: HabitEntry[], range: Exclude<TimeRange, 'ALL'>, now: Date = new Date()): number {
  const days = RANGE_DAYS[range]
  const todayStr = getTodayDateString(now)
  const startStr = addDaysToDateString(todayStr, -(days - 1))

  if (habit.frequency.type === 'weekly') {
    const weeks = Math.max(days / 7, 1)
    const target = habit.frequency.timesPerWeek * weeks
    if (target <= 0) return 0
    const completed = getEntriesForHabit(entries, habit.id).filter((entry) => entry.date >= startStr && entry.date <= todayStr).length
    return round1(clamp((completed / target) * 100, 0, 100))
  }

  let scheduled = 0
  let completed = 0
  let cursor = startStr
  while (cursor <= todayStr) {
    if (isHabitScheduledOn(habit.frequency, cursor)) {
      scheduled += 1
      if (isHabitCompletedOn(entries, habit.id, cursor)) completed += 1
    }
    cursor = addDaysToDateString(cursor, 1)
  }
  if (scheduled === 0) return 0
  return round1((completed / scheduled) * 100)
}

export function getHabitStats(habit: Habit, entries: HabitEntry[], now: Date = new Date()): HabitStats {
  const todayStr = getTodayDateString(now)
  const habitEntries = getEntriesForHabit(entries, habit.id)

  let scheduledCount = 0
  if (habit.frequency.type === 'weekly') {
    const createdStr = habit.createdAt.slice(0, 10)
    const daysSinceCreated = Math.max(Math.round((new Date(todayStr).getTime() - new Date(createdStr).getTime()) / 86_400_000), 0)
    const weeksElapsed = Math.floor(daysSinceCreated / 7) + 1
    scheduledCount = habit.frequency.timesPerWeek * weeksElapsed
  } else {
    let cursor = habit.createdAt.slice(0, 10)
    while (cursor <= todayStr) {
      if (isHabitScheduledOn(habit.frequency, cursor)) scheduledCount += 1
      cursor = addDaysToDateString(cursor, 1)
    }
  }

  return {
    habitId: habit.id,
    currentStreak: getCurrentStreak(habit, entries, now),
    bestStreak: getBestStreak(habit, entries, now),
    completionRate: getCompletionRate(habit, entries, '30D', now),
    completedCount: habitEntries.length,
    scheduledCount,
  }
}

// ---------------------------------------------------------------------------
// Weekly strip — Mon-Sun statuses for a single habit, for the compact view.
// ---------------------------------------------------------------------------

export interface WeeklyStripDay {
  date: string
  status: HabitDayStatus
}

export function getWeeklyStrip(habit: Habit, entries: HabitEntry[], now: Date = new Date()): WeeklyStripDay[] {
  const monday = getMonday(getTodayDateString(now))
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateString(monday, index)
    return { date, status: getHabitStatusForDate(habit, entries, date) }
  })
}

// ---------------------------------------------------------------------------
// Water tracking
// ---------------------------------------------------------------------------

export function getWaterLogsForDate(logs: WaterLog[], dateStr: string): WaterLog[] {
  return logs.filter((log) => log.date === dateStr)
}

/** Always derived from logs, never stored directly — and never negative. */
export function getDailyWaterMl(logs: WaterLog[], dateStr: string): number {
  return Math.max(
    getWaterLogsForDate(logs, dateStr).reduce((total, log) => total + log.amountMl, 0),
    0,
  )
}

export function getWaterGoalPercent(consumedMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0
  return round1(clamp((consumedMl / goalMl) * 100, 0, 100))
}

export function getRemainingWaterMl(consumedMl: number, goalMl: number): number {
  return Math.max(goalMl - consumedMl, 0)
}

export function mlToLiters(ml: number): number {
  return round1(ml / 1000)
}

export function litersToMl(liters: number): number {
  return Math.round(liters * 1000)
}

/** The most recently created entry for a date — what "undo latest" removes. */
/**
 * The most recently added entry for a date — what "undo latest" removes.
 * Uses array/insertion order rather than comparing `createdAt` strings,
 * since two quick log actions can share the same millisecond timestamp.
 */
export function getLatestWaterLogForDate(logs: WaterLog[], dateStr: string): WaterLog | null {
  const dayLogs = getWaterLogsForDate(logs, dateStr)
  return dayLogs.length === 0 ? null : dayLogs[dayLogs.length - 1]!
}

export interface WaterHistoryPoint {
  date: string
  amountMl: number
}

export function getWaterHistory(logs: WaterLog[], range: TimeRange, now: Date = new Date()): WaterHistoryPoint[] {
  const inRange = logs.filter((log) => isWithinRange(log.date, range, now))
  const byDate = new Map<string, number>()
  for (const log of inRange) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.amountMl)
  }
  return [...byDate.entries()]
    .map(([date, amountMl]) => ({ date, amountMl }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
