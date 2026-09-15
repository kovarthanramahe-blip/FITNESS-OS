import { BADGES } from '@/data/gamification'
import type { Badge } from '@/types/gamification'
import type { ActivitySnapshot } from '@/utils/gamification'
import { getLevelForXp } from '@/utils/gamification'
import { getHabitConsistencyStreak } from '@/utils/streaks'
import { getCurrentWeekStreak } from '@/utils/progress'
import { getDailyWaterMl } from '@/utils/habits'

export interface BadgeContext {
  snapshot: ActivitySnapshot
  totalXp: number
}

function countDistinctDates(items: { date: string }[]): number {
  return new Set(items.map((item) => item.date)).size
}

function countWaterGoalDaysReached(snapshot: ActivitySnapshot): number {
  if (snapshot.waterGoal.goalMl <= 0) return 0
  const dates = new Set(snapshot.waterLogs.map((log) => log.date))
  let count = 0
  for (const date of dates) {
    if (getDailyWaterMl(snapshot.waterLogs, date) >= snapshot.waterGoal.goalMl) count += 1
  }
  return count
}

/** Whether at least `minCount` workouts fall within 7 days of the very first logged workout. */
function completedWorkoutsInFirstWeek(snapshot: ActivitySnapshot, minCount: number): boolean {
  if (snapshot.workoutHistory.length === 0) return false
  const sorted = [...snapshot.workoutHistory].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]!
  const firstWeekEnd = new Date(first.date)
  firstWeekEnd.setDate(firstWeekEnd.getDate() + 7)
  const count = sorted.filter((entry) => new Date(entry.date).getTime() <= firstWeekEnd.getTime()).length
  return count >= minCount
}

function totalCompletedSets(snapshot: ActivitySnapshot): number {
  return snapshot.workoutHistory.reduce((total, entry) => total + entry.setCount, 0)
}

/**
 * One deterministic predicate per badge, each calculable purely from
 * existing store data (plus the gamification profile's own total XP for
 * the level-based badge). Never arbitrary — every requirement here mirrors
 * the human-readable text in data/gamification.ts.
 */
const BADGE_REQUIREMENTS: Record<string, (ctx: BadgeContext) => boolean> = {
  'first-workout': ({ snapshot }) => snapshot.workoutHistory.length >= 1,
  'week-one': ({ snapshot }) => completedWorkoutsInFirstWeek(snapshot, 3),
  'pr-club': ({ snapshot }) => snapshot.personalRecords.length >= 1,
  'iron-will': ({ snapshot }) => snapshot.personalRecords.length >= 5,
  'nutrition-logger': ({ snapshot }) => countDistinctDates(snapshot.foodEntries) >= 7,
  'macro-master': ({ snapshot }) => countDistinctDates(snapshot.foodEntries) >= 30,
  hydrated: ({ snapshot }) => countWaterGoalDaysReached(snapshot) >= 7,
  'hydration-hero': ({ snapshot }) => countWaterGoalDaysReached(snapshot) >= 30,
  consistent: ({ snapshot }) => getHabitConsistencyStreak(snapshot.habits, snapshot.habitEntries, snapshot.now) >= 7,
  unstoppable: ({ snapshot }) => getHabitConsistencyStreak(snapshot.habits, snapshot.habitEntries, snapshot.now) >= 30,
  'weight-tracker': ({ snapshot }) => countDistinctDates(snapshot.weightLogs) >= 10,
  transformation: ({ snapshot }) => countDistinctDates(snapshot.weightLogs) >= 30,
  century: ({ snapshot }) => totalCompletedSets(snapshot) >= 100,
  'level-10': ({ totalXp }) => getLevelForXp(totalXp) >= 10,
  dedicated: ({ snapshot }) => getCurrentWeekStreak(snapshot.workoutHistory, snapshot.now) >= 8,
}

/**
 * Returns only badges that are newly earned: not already in
 * `alreadyEarnedIds` and whose requirement is currently met. Calling this
 * repeatedly against unchanged data always returns the same (or an empty)
 * set — idempotent by construction, since the caller only ever appends ids
 * this function returns.
 */
export function evaluateBadges(context: BadgeContext, alreadyEarnedIds: string[]): Badge[] {
  const earnedSet = new Set(alreadyEarnedIds)
  return BADGES.filter((badge) => !earnedSet.has(badge.id) && (BADGE_REQUIREMENTS[badge.id]?.(context) ?? false))
}
