export function getScoreLabel(score: number, max = 100): string {
  const percent = (score / max) * 100
  if (percent >= 85) return 'Excellent day'
  if (percent >= 70) return 'Great day'
  if (percent >= 50) return 'Good progress'
  return "Let's build momentum"
}

export function getRemaining(consumed: number, target: number): number {
  return Math.max(target - consumed, 0)
}

import type { DayActivityStatus, WeekActivityDay } from '@/types/dashboard'
import type { WorkoutHistoryEntry } from '@/types/workout'
import { toDateString } from './dateRange'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Derives the last 7 days of real activity from workout history — never
 * fabricated numbers. A day is `complete` only when a history entry exists
 * for it; past days with none are `missed`, and today counts as `upcoming`
 * until a workout is actually logged.
 */
export function getWeeklyActivityFromHistory(history: WorkoutHistoryEntry[], today: Date = new Date()): WeekActivityDay[] {
  const entriesByDate = new Map<string, WorkoutHistoryEntry>()
  for (const entry of history) {
    const dateKey = entry.date.slice(0, 10)
    if (!entriesByDate.has(dateKey)) entriesByDate.set(dateKey, entry)
  }

  const days: WeekActivityDay[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    const dateKey = toDateString(date)
    const entry = entriesByDate.get(dateKey)

    let status: DayActivityStatus
    if (entry) status = 'complete'
    else if (offset === 0) status = 'upcoming'
    else status = 'missed'

    days.push({
      day: DAY_LABELS[date.getDay()] ?? '',
      status,
      workoutMinutes: entry?.durationMinutes ?? 0,
      caloriesBurned: entry?.estimatedCalories ?? 0,
    })
  }
  return days
}

export type NextActionId = 'workout' | 'protein' | 'water' | 'habit'

export interface NextAction {
  id: NextActionId
  title: string
  description: string
  href: string
}

export interface NextActionInput {
  /** A workout is actually scheduled today — false on a rest/active-recovery day. */
  hasWorkoutScheduledToday: boolean
  /** A workout history entry already exists for today (see getWeeklyActivityFromHistory's own 'complete' check). */
  workoutCompletedToday: boolean
  proteinConsumed: number
  proteinTarget: number
  waterConsumedMl: number
  waterGoalMl: number
  /** The first active, scheduled-today habit/reminder that isn't completed yet, if any. */
  nextIncompleteHabitName: string | null
}

/** Below this fraction of the protein target counts as "significantly behind" — not just "not finished yet". */
const PROTEIN_SHORTFALL_RATIO = 0.7

/**
 * The single highest-priority thing to do today, derived entirely from real
 * store state — never a fabricated or subjective fitness recommendation.
 * Checked in a fixed priority order (workout, then protein, then water,
 * then habits) and falls through to the next item once the one ahead of it
 * is already satisfied; returns `null` only when every checked signal is
 * already on track, meaning there's genuinely nothing left to surface.
 */
export function getNextAction(input: NextActionInput): NextAction | null {
  if (input.hasWorkoutScheduledToday && !input.workoutCompletedToday) {
    return {
      id: 'workout',
      title: "Start today's workout",
      description: "It's still open on your schedule.",
      href: '/workout',
    }
  }

  if (input.proteinTarget > 0 && input.proteinConsumed < input.proteinTarget * PROTEIN_SHORTFALL_RATIO) {
    const remaining = Math.round(input.proteinTarget - input.proteinConsumed)
    return {
      id: 'protein',
      title: 'Log protein',
      description: `${remaining}g remaining to hit today's target`,
      href: '/nutrition',
    }
  }

  if (input.waterGoalMl > 0 && input.waterConsumedMl < input.waterGoalMl) {
    const remainingLiters = (input.waterGoalMl - input.waterConsumedMl) / 1000
    return {
      id: 'water',
      title: 'Log water',
      description: `${remainingLiters.toFixed(1)}L remaining to hit today's goal`,
      href: '/nutrition',
    }
  }

  if (input.nextIncompleteHabitName) {
    return {
      id: 'habit',
      title: `Complete "${input.nextIncompleteHabitName}"`,
      description: "Still open on today's habit list.",
      href: '/habits',
    }
  }

  return null
}

export type WeightTrendStatus = 'positive' | 'negative' | 'neutral'

/**
 * Whether a weight change is moving toward the target, away from it, or the
 * person is already at their target. Purely directional — not a health judgement.
 */
export function getWeightTrendStatus(
  changeKg: number,
  currentKg: number,
  targetKg: number,
): WeightTrendStatus {
  const distanceBefore = Math.abs(currentKg - changeKg - targetKg)
  const distanceAfter = Math.abs(currentKg - targetKg)
  if (distanceAfter < distanceBefore) return 'positive'
  if (distanceAfter > distanceBefore) return 'negative'
  return 'neutral'
}
