import { LEVEL_TIERS, XP_REWARDS } from '@/data/gamification'
import { getProgramById } from '@/data/programs'
import { getHabitState } from '@/lib/habitStore'
import { getNutritionState } from '@/lib/nutritionStore'
import { getProgressState } from '@/lib/progressStore'
import { getWorkoutState } from '@/lib/workoutStore'
import type { BodyMeasurement, PersonalRecord, WeightLog } from '@/types/progress'
import type { FoodEntry, WaterGoal, WaterLog } from '@/types/nutrition'
import type { Habit, HabitEntry } from '@/types/habits'
import type { ProgramDay, WorkoutHistoryEntry } from '@/types/workout'
import type { XPEvent, XPEventType } from '@/types/gamification'
import { clamp } from '@/utils/format'
import { getDailyWaterMl, getEntriesForDate } from '@/utils/nutrition'
import { isHabitCompletedOn, isHabitScheduledOn } from '@/utils/habits'
import { resolveProgramDay } from '@/utils/workout'

// ---------------------------------------------------------------------------
// Activity snapshot — a plain, testable read of the 4 existing stores.
// Gamification never stores any of this itself; it only derives from it.
// ---------------------------------------------------------------------------

export interface ActivitySnapshot {
  workoutHistory: WorkoutHistoryEntry[]
  personalRecords: PersonalRecord[]
  foodEntries: FoodEntry[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  waterLogs: WaterLog[]
  waterGoal: WaterGoal
  weightLogs: WeightLog[]
  measurements: BodyMeasurement[]
  /** Today's resolved program day type, when a program is selected — reused for schedule-aware daily challenges (e.g. no mandatory workout challenge on a rest day). */
  todayProgramDayType: ProgramDay['type'] | null
  now: Date
}

function resolveTodayProgramDayType(selectedProgramId: string | null, currentDayIndex: number): ProgramDay['type'] | null {
  if (!selectedProgramId) return null
  const program = getProgramById(selectedProgramId)
  if (!program) return null
  return resolveProgramDay(program, currentDayIndex).type
}

export function getActivitySnapshot(now: Date = new Date()): ActivitySnapshot {
  const workout = getWorkoutState()
  const progress = getProgressState()
  const nutrition = getNutritionState()
  const habit = getHabitState()

  return {
    workoutHistory: workout.history,
    personalRecords: workout.personalRecords,
    foodEntries: nutrition.entries,
    habits: habit.habits,
    habitEntries: habit.entries,
    waterLogs: nutrition.waterLogs,
    waterGoal: nutrition.waterGoal,
    weightLogs: progress.weightLogs,
    measurements: progress.measurements,
    todayProgramDayType: resolveTodayProgramDayType(workout.selectedProgramId, workout.currentDayIndex),
    now,
  }
}

// ---------------------------------------------------------------------------
// Level curve — an arithmetic-progression XP requirement per level
// (R(n) = LEVEL_BASE + LEVEL_STEP * (n-1)), which makes the cumulative XP
// to reach a level a closed-form quadratic. That means every lookup below
// is O(1) (a quadratic-formula inversion, not a loop), so it stays correct
// and fast even at very large XP totals — no risk of NaN/Infinity or a
// runaway loop.
// ---------------------------------------------------------------------------

const LEVEL_BASE = 100
const LEVEL_STEP = 50

/** XP required to go from `level` to `level + 1`. */
export function getXpRequiredForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1
  return LEVEL_BASE + LEVEL_STEP * n
}

/** Total XP needed to reach the *start* of `level` (level 1 starts at 0 XP). */
function cumulativeXpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1
  return LEVEL_BASE * n + (LEVEL_STEP / 2) * n * (n - 1)
}

export function getLevelForXp(xp: number): number {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0

  // Invert cumulativeXpForLevel: (LEVEL_STEP/2)n^2 + (LEVEL_BASE - LEVEL_STEP/2)n - xp = 0
  const a = LEVEL_STEP / 2
  const b = LEVEL_BASE - LEVEL_STEP / 2
  const discriminant = b * b + 4 * a * safeXp
  const nRaw = (-b + Math.sqrt(discriminant)) / (2 * a)
  let level = Math.max(1, Math.floor(nRaw + 1e-9) + 1)

  // Bounded correction for floating-point edge cases right at a boundary —
  // never more than a couple of iterations, regardless of XP magnitude.
  while (cumulativeXpForLevel(level + 1) <= safeXp) level += 1
  while (level > 1 && cumulativeXpForLevel(level) > safeXp) level -= 1

  return level
}

export function getXpIntoCurrentLevel(xp: number): number {
  const level = getLevelForXp(xp)
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0
  return Math.max(0, safeXp - cumulativeXpForLevel(level))
}

export function getXpToNextLevel(xp: number): number {
  const level = getLevelForXp(xp)
  const required = getXpRequiredForLevel(level)
  return Math.max(0, required - getXpIntoCurrentLevel(xp))
}

export function getLevelProgressPercent(xp: number): number {
  const level = getLevelForXp(xp)
  const required = getXpRequiredForLevel(level)
  if (required <= 0) return 0
  return clamp((getXpIntoCurrentLevel(xp) / required) * 100, 0, 100)
}

/** The named tier for a level — levels past the last defined tier keep its title. */
export function getLevelTitle(level: number): string {
  let title = LEVEL_TIERS[0]?.title ?? 'Beginner'
  for (const tier of LEVEL_TIERS) {
    if (tier.minLevel <= level) title = tier.title
    else break
  }
  return title
}

// ---------------------------------------------------------------------------
// XP events — deterministic derivation from the activity snapshot. Every
// event id is built from a stable source id, so recomputing this from
// unchanged data always yields the exact same set of ids: nothing here
// "awards" XP by itself, it only describes what *should* exist.
// ---------------------------------------------------------------------------

function xpEvent(
  id: string,
  type: XPEventType,
  amount: number,
  date: string,
  sourceId: string,
  description: string,
): XPEvent {
  return { id, type, amount, date, sourceId, description }
}

/** Minimum distinct meal types logged in a day to count as "completed daily nutrition logging". */
const DAILY_NUTRITION_MEAL_THRESHOLD = 3

export function deriveEligibleXpEvents(snapshot: ActivitySnapshot): XPEvent[] {
  const events: XPEvent[] = []

  for (const entry of snapshot.workoutHistory) {
    events.push(
      xpEvent(
        `workout-session-${entry.id}`,
        'workout_session_complete',
        XP_REWARDS.workoutSessionComplete,
        entry.date.slice(0, 10),
        entry.id,
        `Completed ${entry.name}`,
      ),
    )
  }

  for (const record of snapshot.personalRecords) {
    events.push(
      xpEvent(
        `pr-${record.id}`,
        'personal_record',
        XP_REWARDS.personalRecord,
        record.date.slice(0, 10),
        record.id,
        `New PR: ${record.exercise}`,
      ),
    )
  }

  // Nutrition — capped at one "logged" event per date, regardless of how
  // many entries exist that day, so adding/deleting entries can't farm XP.
  const nutritionDates = new Set(snapshot.foodEntries.map((entry) => entry.date))
  for (const date of nutritionDates) {
    events.push(xpEvent(`nutrition-log-${date}`, 'nutrition_log', XP_REWARDS.nutritionLog, date, date, 'Logged nutrition'))

    const mealsLogged = new Set(getEntriesForDate(snapshot.foodEntries, date).map((entry) => entry.meal)).size
    if (mealsLogged >= DAILY_NUTRITION_MEAL_THRESHOLD) {
      events.push(
        xpEvent(
          `nutrition-daily-${date}`,
          'nutrition_daily_complete',
          XP_REWARDS.nutritionDailyComplete,
          date,
          date,
          'Completed daily nutrition logging',
        ),
      )
    }
  }

  // Habit completions are keyed by (habit, date) rather than the entry's own
  // id: uncompleting a habit deletes its entry, so completing it again the
  // same day would otherwise mint a fresh id every cycle and farm XP.
  const seenHabitCompletions = new Set<string>()
  for (const entry of snapshot.habitEntries) {
    const key = `${entry.habitId}-${entry.date}`
    if (seenHabitCompletions.has(key)) continue
    seenHabitCompletions.add(key)
    events.push(xpEvent(`habit-complete-${key}`, 'habit_complete', XP_REWARDS.habitComplete, entry.date, key, 'Completed a habit'))
  }

  // Habit daily target — every habit actually scheduled that day was completed.
  const habitDates = new Set(snapshot.habitEntries.map((entry) => entry.date))
  for (const date of habitDates) {
    const scheduled = snapshot.habits.filter((habit) => habit.active && isHabitScheduledOn(habit.frequency, date))
    if (scheduled.length === 0) continue
    const allDone = scheduled.every((habit) => isHabitCompletedOn(snapshot.habitEntries, habit.id, date))
    if (allDone) {
      events.push(
        xpEvent(`habit-daily-${date}`, 'habit_daily_target', XP_REWARDS.habitDailyTarget, date, date, 'Completed daily habit target'),
      )
    }
  }

  const waterDates = new Set(snapshot.waterLogs.map((log) => log.date))
  for (const date of waterDates) {
    if (snapshot.waterGoal.goalMl <= 0) continue
    const total = getDailyWaterMl(snapshot.waterLogs, date)
    if (total >= snapshot.waterGoal.goalMl) {
      events.push(xpEvent(`water-goal-${date}`, 'water_goal_reached', XP_REWARDS.waterGoalReached, date, date, 'Reached water goal'))
    }
  }

  // Weight logs can be deleted and re-added (utils/progressStore.ts
  // `deleteWeightLog`), so — like nutrition — this is capped at one event
  // per date rather than keyed by the log's own id.
  const weightDates = new Set(snapshot.weightLogs.map((log) => log.date))
  for (const date of weightDates) {
    events.push(xpEvent(`weight-log-${date}`, 'weight_log', XP_REWARDS.weightLog, date, date, 'Logged weight'))
  }

  // Same reasoning as weight logs, keyed by (type, date) since a person can
  // legitimately log several different measurement types on the same day.
  const seenMeasurements = new Set<string>()
  for (const measurement of snapshot.measurements) {
    const key = `${measurement.type}-${measurement.date}`
    if (seenMeasurements.has(key)) continue
    seenMeasurements.add(key)
    events.push(
      xpEvent(`measurement-log-${key}`, 'body_measurement_log', XP_REWARDS.bodyMeasurementLog, measurement.date, key, `Logged ${measurement.type}`),
    )
  }

  return events
}

// ---------------------------------------------------------------------------
// Idempotency — the core guarantee: a qualifying action can only ever
// contribute XP once, keyed by its stable event id.
// ---------------------------------------------------------------------------

export function hasAwardedXp(existingEvents: XPEvent[], eventId: string): boolean {
  return existingEvents.some((event) => event.id === eventId)
}

/** Appends `event` only if its id hasn't already been recorded. */
export function awardXpOnce(existingEvents: XPEvent[], event: XPEvent): XPEvent[] {
  if (hasAwardedXp(existingEvents, event.id)) return existingEvents
  return [...existingEvents, event]
}

/** Every eligible event not already present in `existingEvents`, ready to append. */
export function reconcileNewXpEvents(existingEvents: XPEvent[], eligibleEvents: XPEvent[]): XPEvent[] {
  const existingIds = new Set(existingEvents.map((event) => event.id))
  return eligibleEvents.filter((event) => !existingIds.has(event.id))
}

export function getTotalXp(events: XPEvent[]): number {
  return events.reduce((total, event) => total + event.amount, 0)
}

/**
 * Most recent first. `date` is only day-granularity, so several events can
 * legitimately share the same date — ties are broken by recording order
 * (the store always appends new events to the end), most-recently-recorded
 * first, so a just-earned event never gets buried behind older same-day
 * ones.
 */
export function sortXpEventsRecentFirst(events: XPEvent[]): XPEvent[] {
  return [...events].reverse().sort((a, b) => b.date.localeCompare(a.date))
}
