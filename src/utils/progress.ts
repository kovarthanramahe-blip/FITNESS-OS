import { getExerciseById } from '@/data/exercises'
import type { PersonalRecord, ProgressTimeRange, StrengthProgress, StrengthProgressPoint, WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession, WorkoutSet } from '@/types/workout'
import { filterByRange, isWithinRange } from '@/utils/dateRange'
import { estimateOneRepMax } from '@/utils/personalRecords'
import { getExerciseVolumeKg, getSessionVolumeKg } from '@/utils/workout'
import { clamp } from '@/utils/format'

export { filterByRange, isWithinRange }

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function daysBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000
}

function daysAgo(dateIso: string, now: Date): number {
  return (now.getTime() - new Date(dateIso).getTime()) / 86_400_000
}

// ---------------------------------------------------------------------------
// Weight tracking
// ---------------------------------------------------------------------------

function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date))
}

export function getCurrentWeightLog(logs: WeightLog[]): WeightLog | null {
  if (logs.length === 0) return null
  return sortByDateAsc(logs)[logs.length - 1] ?? null
}

export function getWeightChangeKg(currentWeightKg: number, startingWeightKg: number): number {
  return round1(currentWeightKg - startingWeightKg)
}

/**
 * Progress toward a target as a 0-100 percentage, direction-agnostic — works
 * the same whether the target is below starting (loss) or above it (gain).
 * Returns null when starting and target are identical (no direction to
 * measure progress against).
 */
export function getTargetProgressPercent(
  currentWeightKg: number,
  startingWeightKg: number,
  targetWeightKg: number,
): number | null {
  const totalChange = targetWeightKg - startingWeightKg
  if (totalChange === 0) return currentWeightKg === targetWeightKg ? 100 : null
  const actualChange = currentWeightKg - startingWeightKg
  return round1(clamp((actualChange / totalChange) * 100, 0, 100))
}

/**
 * Whether a weight change moved toward the goal, direction-agnostic — true
 * for weight lost toward a lower target, or weight gained toward a higher
 * one. Neither direction is treated as inherently better than the other.
 */
export function isChangeTowardGoal(changeKg: number, startingWeightKg: number, targetWeightKg: number): boolean {
  const goalDirection = targetWeightKg - startingWeightKg
  if (goalDirection === 0 || changeKg === 0) return false
  return Math.sign(changeKg) === Math.sign(goalDirection)
}

/** Null unless the log spans at least 7 days, so the rate is meaningful. */
export function getAverageWeeklyChangeKg(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null
  const sorted = sortByDateAsc(logs)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) return null
  const span = daysBetween(first.date, last.date)
  if (span < 7) return null
  return round1(((last.weightKg - first.weightKg) / span) * 7)
}

export function getLowestWeightLog(logs: WeightLog[]): WeightLog | null {
  if (logs.length === 0) return null
  return logs.reduce((lowest, log) => (log.weightKg < lowest.weightKg ? log : lowest))
}

export function getHighestWeightLog(logs: WeightLog[]): WeightLog | null {
  if (logs.length === 0) return null
  return logs.reduce((highest, log) => (log.weightKg > highest.weightKg ? log : highest))
}

/** Total change over the last N days, or null if there isn't at least 2 points in that window. */
export function getWeightChangeOverDays(logs: WeightLog[], days: number, now: Date = new Date()): number | null {
  const inWindow = sortByDateAsc(logs.filter((log) => {
    const age = daysAgo(log.date, now)
    return age >= 0 && age <= days
  }))
  if (inWindow.length < 2) return null
  const first = inWindow[0]
  const last = inWindow[inWindow.length - 1]
  if (!first || !last) return null
  return round1(last.weightKg - first.weightKg)
}

/** Change between the two most recent entries, or null with fewer than two logs. */
export function getChangeFromPreviousEntry(logs: WeightLog[]): number | null {
  const sorted = sortByDateAsc(logs)
  if (sorted.length < 2) return null
  const last = sorted[sorted.length - 1]
  const previous = sorted[sorted.length - 2]
  if (!last || !previous) return null
  return round1(last.weightKg - previous.weightKg)
}

// ---------------------------------------------------------------------------
// Training volume — reuses getSessionVolumeKg/getExerciseVolumeKg, never
// recomputes volume from scratch.
// ---------------------------------------------------------------------------

function completedSessionsInRange(
  sessions: WorkoutSession[],
  range: ProgressTimeRange,
  now: Date,
): WorkoutSession[] {
  const completed = sessions.filter((session): session is WorkoutSession & { completedAt: string } =>
    Boolean(session.completedAt),
  )
  return filterByRange(completed, (session) => session.completedAt, range, now)
}

export function getVolumeInRangeKg(sessions: WorkoutSession[], range: ProgressTimeRange, now: Date = new Date()): number {
  const inRange = completedSessionsInRange(sessions, range, now)
  return round1(inRange.reduce((total, session) => total + getSessionVolumeKg(session), 0))
}

export function getWeeklyVolumeKg(sessions: WorkoutSession[], now: Date = new Date()): number {
  return getVolumeInRangeKg(sessions, '7D', now)
}

export function getMonthlyVolumeKg(sessions: WorkoutSession[], now: Date = new Date()): number {
  return getVolumeInRangeKg(sessions, '30D', now)
}

export interface VolumeTrend {
  recentVolumeKg: number
  previousVolumeKg: number
  /** Null when there's no prior-window volume to compare against. */
  changePercent: number | null
}

/** Compares the last `windowDays` of volume to the `windowDays` before that. */
export function getVolumeTrend(
  sessions: WorkoutSession[],
  exerciseId: string | null,
  windowDays = 30,
  now: Date = new Date(),
): VolumeTrend {
  const relevant = exerciseId
    ? sessions.filter((session) => session.exercises.some((exercise) => exercise.exerciseId === exerciseId))
    : sessions
  const completed = relevant.filter((session): session is WorkoutSession & { completedAt: string } =>
    Boolean(session.completedAt),
  )

  const volumeOf = (list: typeof completed) =>
    list.reduce((total, session) => {
      if (!exerciseId) return total + getSessionVolumeKg(session)
      const exercise = session.exercises.find((candidate) => candidate.exerciseId === exerciseId)
      return exercise ? total + getExerciseVolumeKg(exercise) : total
    }, 0)

  const recent = completed.filter((session) => {
    const age = daysAgo(session.completedAt, now)
    return age >= 0 && age < windowDays
  })
  const previous = completed.filter((session) => {
    const age = daysAgo(session.completedAt, now)
    return age >= windowDays && age < windowDays * 2
  })

  const recentVolumeKg = round1(volumeOf(recent))
  const previousVolumeKg = round1(volumeOf(previous))
  const changePercent = previousVolumeKg > 0 ? round1(((recentVolumeKg - previousVolumeKg) / previousVolumeKg) * 100) : null

  return { recentVolumeKg, previousVolumeKg, changePercent }
}

// ---------------------------------------------------------------------------
// Strength progression — derived entirely from workout history + personal
// records already tracked by the workout store; no parallel dataset.
// ---------------------------------------------------------------------------

function bestSetByEstimatedOneRepMax(sets: WorkoutSet[]): { set: WorkoutSet; estimate: number } | null {
  let best: { set: WorkoutSet; estimate: number } | null = null
  for (const set of sets) {
    if (!set.completed) continue
    const estimate = estimateOneRepMax(set.weightKg, set.reps)
    if (!best || estimate > best.estimate) best = { set, estimate }
  }
  return best
}

export function getStrengthProgress(
  exerciseId: string,
  sessions: WorkoutSession[],
  personalRecords: PersonalRecord[],
): StrengthProgress {
  const exercise = getExerciseById(exerciseId)
  const exerciseName = exercise?.name ?? exerciseId
  const personalRecordCount = personalRecords.filter((record) => record.exerciseId === exerciseId).length

  const relevantSessions = sessions
    .filter((session): session is WorkoutSession & { completedAt: string } => Boolean(session.completedAt))
    .filter((session) => session.exercises.some((ex) => ex.exerciseId === exerciseId && ex.sets.some((set) => set.completed)))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))

  const history: StrengthProgressPoint[] = []
  let totalVolumeKg = 0

  for (const session of relevantSessions) {
    const exerciseEntry = session.exercises.find((ex) => ex.exerciseId === exerciseId)
    if (!exerciseEntry) continue
    totalVolumeKg += getExerciseVolumeKg(exerciseEntry)
    const best = bestSetByEstimatedOneRepMax(exerciseEntry.sets)
    if (best) {
      history.push({
        date: session.completedAt,
        estimatedOneRepMax: best.estimate,
        weightKg: best.set.weightKg,
        reps: best.set.reps,
      })
    }
  }

  const lastPoint = history[history.length - 1] ?? null
  const previousPoint = history.length > 1 ? (history[history.length - 2] ?? null) : null
  const bestEstimate = history.length > 0 ? Math.max(...history.map((point) => point.estimatedOneRepMax)) : null

  return {
    exerciseId,
    exerciseName,
    currentBest: lastPoint ? { weightKg: lastPoint.weightKg, reps: lastPoint.reps, date: lastPoint.date } : null,
    previousBest: previousPoint
      ? { weightKg: previousPoint.weightKg, reps: previousPoint.reps, date: previousPoint.date }
      : null,
    estimatedOneRepMax: bestEstimate,
    totalVolumeKg: round1(totalVolumeKg),
    personalRecordCount,
    history,
  }
}

/** Every exercise id that has at least one completed set logged, for a selector. */
export function getTrainedExerciseIds(sessions: WorkoutSession[]): string[] {
  const ids = new Set<string>()
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.sets.some((set) => set.completed)) ids.add(exercise.exerciseId)
    }
  }
  return [...ids]
}

// ---------------------------------------------------------------------------
// Workout frequency
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export interface WeekdayActivity {
  day: string
  date: string
  hasWorkout: boolean
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Mon-Sun for the week containing `now`. Rest days simply show no workout — never a "failure". */
export function getWeeklyFrequency(history: WorkoutHistoryEntry[], now: Date = new Date()): WeekdayActivity[] {
  const monday = getMonday(now)
  const completedDates = new Set(history.map((entry) => entry.date.slice(0, 10)))

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + index)
    const dateStr = date.toISOString().slice(0, 10)
    return { day: label, date: dateStr, hasWorkout: completedDates.has(dateStr) }
  })
}

export interface CalendarDay {
  date: string
  dayOfMonth: number
  hasWorkout: boolean
  isFuture: boolean
}

/** A simple month grid (day 1..N) for the frequency calendar view. */
export function getMonthlyActivityCalendar(
  history: WorkoutHistoryEntry[],
  year: number,
  month: number,
  now: Date = new Date(),
): CalendarDay[] {
  const completedDates = new Set(history.map((entry) => entry.date.slice(0, 10)))
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1)
    const dateStr = date.toISOString().slice(0, 10)
    return {
      date: dateStr,
      dayOfMonth: index + 1,
      hasWorkout: completedDates.has(dateStr),
      isFuture: date.getTime() > now.getTime(),
    }
  })
}

/** Consecutive weeks (including the current one) with at least one workout. */
export function getCurrentWeekStreak(history: WorkoutHistoryEntry[], now: Date = new Date()): number {
  if (history.length === 0) return 0

  const hasWorkoutInWeek = (weekStart: Date): boolean => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return history.some((entry) => {
      const time = new Date(entry.date).getTime()
      return time >= weekStart.getTime() && time < weekEnd.getTime()
    })
  }

  let streak = 0
  let cursor = getMonday(now)
  while (hasWorkoutInWeek(cursor)) {
    streak += 1
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

// ---------------------------------------------------------------------------
// Workout analytics summary
// ---------------------------------------------------------------------------

export interface WorkoutAnalyticsSummary {
  totalWorkouts: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  avgDurationMinutes: number | null
  totalVolumeKg: number
  avgWeeklyVolumeKg: number | null
  personalRecordCount: number
  currentWeekStreak: number
}

export function getWorkoutAnalytics(
  history: WorkoutHistoryEntry[],
  personalRecords: PersonalRecord[],
  now: Date = new Date(),
): WorkoutAnalyticsSummary {
  const totalWorkouts = history.length
  const workoutsThisWeek = filterByRange(history, (entry) => entry.date, '7D', now).length
  const workoutsThisMonth = filterByRange(history, (entry) => entry.date, '30D', now).length
  const totalVolumeKg = round1(history.reduce((total, entry) => total + entry.volumeKg, 0))
  const avgDurationMinutes =
    totalWorkouts > 0 ? round1(history.reduce((total, entry) => total + entry.durationMinutes, 0) / totalWorkouts) : null

  let avgWeeklyVolumeKg: number | null = null
  if (totalWorkouts > 0) {
    const sorted = sortByDateAsc(history)
    const earliest = sorted[0]
    const span = earliest ? Math.max(daysBetween(earliest.date, now.toISOString()), 1) : 7
    const weeksSpan = Math.max(span / 7, 1)
    avgWeeklyVolumeKg = round1(totalVolumeKg / weeksSpan)
  }

  return {
    totalWorkouts,
    workoutsThisWeek,
    workoutsThisMonth,
    avgDurationMinutes,
    totalVolumeKg,
    avgWeeklyVolumeKg,
    personalRecordCount: personalRecords.length,
    currentWeekStreak: getCurrentWeekStreak(history, now),
  }
}
