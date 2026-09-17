import { useCallback, useMemo, useState } from 'react'
import { useHabitStore } from '@/lib/habitStore'
import { useNutritionStore } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
import { getTodayDateString } from '@/utils/dateRange'
import type { CalendarDataSources, CalendarDayActivity, CalendarGridDay } from '@/utils/progressCalendar'
import { getCalendarDayActivity, getCalendarMonthGrid } from '@/utils/progressCalendar'

export interface UseProgressCalendarResult {
  year: number
  /** 0-indexed, matching `Date.getMonth()`. */
  month: number
  monthLabel: string
  grid: CalendarGridDay[]
  today: string
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  getActivity: (date: string) => CalendarDayActivity
}

/**
 * Reads the four existing stores directly (their own `useSyncExternalStore`
 * subscriptions — no new store, no extra subscription) and derives the
 * visible month's grid and per-day activity from them. Both are memoized on
 * the store slices and the visible (year, month), so navigating months or an
 * unrelated store update elsewhere in the app doesn't recompute anything
 * beyond the ~35 visible days.
 */
export function useProgressCalendar(now: Date = new Date()): UseProgressCalendarResult {
  const [cursor, setCursor] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }))

  const { weightLogs } = useProgressStore()
  const { history } = useWorkoutStore()
  const { entries: foodEntries } = useNutritionStore()
  const { habits, entries: habitEntries, waterLogs } = useHabitStore()

  const grid = useMemo(() => getCalendarMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month])

  const sources: CalendarDataSources = useMemo(
    () => ({ workoutHistory: history, weightLogs, foodEntries, waterLogs, habits, habitEntries }),
    [history, weightLogs, foodEntries, waterLogs, habits, habitEntries],
  )

  const activityByDate = useMemo(() => {
    const map = new Map<string, CalendarDayActivity>()
    for (const day of grid) {
      map.set(day.date, getCalendarDayActivity(day.date, sources))
    }
    return map
  }, [grid, sources])

  const getActivity = useCallback(
    (date: string) => activityByDate.get(date) ?? getCalendarDayActivity(date, sources),
    [activityByDate, sources],
  )

  const goToPreviousMonth = useCallback(() => {
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))
  }, [])

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1)),
    [cursor.year, cursor.month],
  )

  return {
    year: cursor.year,
    month: cursor.month,
    monthLabel,
    grid,
    today: getTodayDateString(now),
    goToPreviousMonth,
    goToNextMonth,
    getActivity,
  }
}
