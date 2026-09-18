import { CheckCircle2, Droplets, Flame } from 'lucide-react'
import type { ActivitySnapshot } from '@/utils/gamification'
import type { StreakSummaryItem } from '@/types/gamification'
import type { Habit, HabitEntry } from '@/types/habits'
import type { WaterGoal, WaterLog } from '@/types/nutrition'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { getCurrentWeekStreak } from '@/utils/progress'
import { getDailyWaterMl } from '@/utils/nutrition'
import { isHabitCompletedOn, isHabitScheduledOn } from '@/utils/habits'

/**
 * Consecutive scheduled days where *every* active habit due that day was
 * completed — a cross-habit aggregate, not a replacement for each habit's
 * own per-habit streak (see utils/habits.ts `getCurrentStreak`). Unscheduled
 * days are skipped, and an incomplete "today" doesn't break an otherwise
 * intact streak, matching the same forgiving pattern used there.
 */
export function getHabitConsistencyStreak(habits: Habit[], entries: HabitEntry[], now: Date = new Date()): number {
  const activeHabits = habits.filter((habit) => habit.active)
  if (activeHabits.length === 0) return 0

  const isFullyCompletedOn = (date: string): boolean | null => {
    const scheduled = activeHabits.filter((habit) => isHabitScheduledOn(habit.frequency, date))
    if (scheduled.length === 0) return null
    return scheduled.every((habit) => isHabitCompletedOn(entries, habit.id, date))
  }

  const earliestBound = activeHabits.reduce(
    (min, habit) => (habit.createdAt.slice(0, 10) < min ? habit.createdAt.slice(0, 10) : min),
    activeHabits[0]!.createdAt.slice(0, 10),
  )

  let cursor = getTodayDateString(now)
  if (isFullyCompletedOn(cursor) === false) {
    cursor = addDaysToDateString(cursor, -1)
  }

  let streak = 0
  while (cursor >= earliestBound) {
    const status = isFullyCompletedOn(cursor)
    if (status === null) {
      cursor = addDaysToDateString(cursor, -1)
      continue
    }
    if (!status) break
    streak += 1
    cursor = addDaysToDateString(cursor, -1)
  }
  return streak
}

/**
 * Consecutive days the daily water goal was reached, walking back from
 * today (an incomplete today doesn't break an otherwise intact streak).
 */
export function getWaterStreak(waterLogs: WaterLog[], goal: WaterGoal, now: Date = new Date()): number {
  if (goal.goalMl <= 0 || waterLogs.length === 0) return 0

  const meetsGoal = (date: string) => getDailyWaterMl(waterLogs, date) >= goal.goalMl
  const earliestDate = waterLogs.reduce((min, log) => (log.date < min ? log.date : min), waterLogs[0]!.date)

  let cursor = getTodayDateString(now)
  if (!meetsGoal(cursor)) cursor = addDaysToDateString(cursor, -1)

  let streak = 0
  while (cursor >= earliestDate) {
    if (!meetsGoal(cursor)) break
    streak += 1
    cursor = addDaysToDateString(cursor, -1)
  }
  return streak
}

/**
 * A unified gamification view over 3 distinct, already-existing streak
 * systems — kept clearly separate (different units, different meanings),
 * never averaged or conflated into one number.
 */
export function getStreakSummary(snapshot: ActivitySnapshot): StreakSummaryItem[] {
  const workoutWeeks = getCurrentWeekStreak(snapshot.workoutHistory, snapshot.now)
  const waterDays = getWaterStreak(snapshot.waterLogs, snapshot.waterGoal, snapshot.now)
  const habitDays = getHabitConsistencyStreak(snapshot.habits, snapshot.habitEntries, snapshot.now)

  return [
    { key: 'workout', label: 'Workout', value: workoutWeeks, unit: workoutWeeks === 1 ? 'week' : 'weeks', icon: Flame },
    { key: 'water', label: 'Water', value: waterDays, unit: waterDays === 1 ? 'day' : 'days', icon: Droplets },
    { key: 'habits', label: 'Habits', value: habitDays, unit: habitDays === 1 ? 'day' : 'days', icon: CheckCircle2 },
  ]
}
