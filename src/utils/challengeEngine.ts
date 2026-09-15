import { DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '@/data/gamification'
import type { Challenge, ChallengeProgress, XPEvent, XPEventType } from '@/types/gamification'
import type { ActivitySnapshot } from '@/utils/gamification'
import { addDaysToDateString, getDayOfWeek, getTodayDateString } from '@/utils/dateRange'
import { getDailyWaterMl, isHabitCompletedOn, isHabitScheduledOn } from '@/utils/habits'
import { getEntriesForDate } from '@/utils/nutrition'
import { clamp } from '@/utils/format'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function getMondayOf(dateStr: string): string {
  const day = getDayOfWeek(dateStr)
  const diff = day === 0 ? -6 : 1 - day
  return addDaysToDateString(dateStr, diff)
}

function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(weekStart, index))
}

/**
 * A challenge only "exists" for a period when the activity it measures is
 * actually relevant that period — e.g. a workout-count daily challenge is
 * skipped entirely on a day with no scheduled workout, so a rest day never
 * shows a mandatory (and unmeetable-as-intended) workout goal.
 */
function isChallengeApplicable(challenge: Challenge, snapshot: ActivitySnapshot, periodKey: string): boolean {
  if (!challenge.requiresScheduledActivity) return true

  if (challenge.period === 'daily' && challenge.metric === 'workout_count') {
    return snapshot.todayProgramDayType === 'workout'
  }
  if (challenge.period === 'daily' && challenge.metric === 'habit_completion') {
    return snapshot.habits.some((habit) => habit.active && isHabitScheduledOn(habit.frequency, periodKey))
  }
  return true
}

/**
 * The typed metric evaluators — one branch per ChallengeMetric, each reused
 * directly from existing derived data (never a parallel calculation). The
 * same metric reads slightly differently for a daily vs weekly period
 * (e.g. `nutrition_logging_days` counts meals logged *today* for a daily
 * challenge, but distinct qualifying days across the week for a weekly
 * one), since that's what each period's own example challenge asks for.
 */
function computeCurrentValue(challenge: Challenge, snapshot: ActivitySnapshot, periodKey: string): number {
  const isDaily = challenge.period === 'daily'
  const dates = isDaily ? [periodKey] : getWeekDates(periodKey)

  switch (challenge.metric) {
    case 'workout_count':
      return snapshot.workoutHistory.filter((entry) => dates.includes(entry.date.slice(0, 10))).length

    case 'pr_count':
      return snapshot.personalRecords.filter((record) => dates.includes(record.date.slice(0, 10))).length

    case 'volume_target':
      return round1(
        snapshot.workoutHistory
          .filter((entry) => dates.includes(entry.date.slice(0, 10)))
          .reduce((total, entry) => total + entry.volumeKg, 0),
      )

    case 'water_goal_days':
      if (snapshot.waterGoal.goalMl <= 0) return 0
      return dates.filter((date) => getDailyWaterMl(snapshot.waterLogs, date) >= snapshot.waterGoal.goalMl).length

    case 'weight_logging_days':
      return dates.filter((date) => snapshot.weightLogs.some((log) => log.date === date)).length

    case 'nutrition_logging_days':
      if (isDaily) {
        return new Set(getEntriesForDate(snapshot.foodEntries, periodKey).map((entry) => entry.meal)).size
      }
      return dates.filter((date) => snapshot.foodEntries.some((entry) => entry.date === date)).length

    case 'habit_completion': {
      if (isDaily) {
        const scheduled = snapshot.habits.filter((habit) => habit.active && isHabitScheduledOn(habit.frequency, periodKey))
        return scheduled.filter((habit) => isHabitCompletedOn(snapshot.habitEntries, habit.id, periodKey)).length
      }
      let scheduledCount = 0
      let completedCount = 0
      for (const date of dates) {
        const scheduled = snapshot.habits.filter((habit) => habit.active && isHabitScheduledOn(habit.frequency, date))
        scheduledCount += scheduled.length
        completedCount += scheduled.filter((habit) => isHabitCompletedOn(snapshot.habitEntries, habit.id, date)).length
      }
      if (scheduledCount === 0) return 0
      return round1((completedCount / scheduledCount) * 100)
    }

    default:
      return 0
  }
}

function buildInstances(templates: Challenge[], snapshot: ActivitySnapshot): ChallengeProgress[] {
  const todayStr = getTodayDateString(snapshot.now)
  const weekStart = getMondayOf(todayStr)

  const instances: ChallengeProgress[] = []
  for (const challenge of templates) {
    const periodKey = challenge.period === 'daily' ? todayStr : weekStart
    if (!isChallengeApplicable(challenge, snapshot, periodKey)) continue

    const current = computeCurrentValue(challenge, snapshot, periodKey)
    const target = challenge.target
    const percent = target > 0 ? clamp((current / target) * 100, 0, 100) : 0

    instances.push({
      instanceId: `${challenge.id}-${periodKey}`,
      challenge,
      periodKey,
      current,
      target,
      percent,
      completed: current >= target,
      remaining: Math.max(target - current, 0),
    })
  }
  return instances
}

export function getDailyChallengeProgress(snapshot: ActivitySnapshot): ChallengeProgress[] {
  return buildInstances(DAILY_CHALLENGES, snapshot)
}

export function getWeeklyChallengeProgress(snapshot: ActivitySnapshot): ChallengeProgress[] {
  return buildInstances(WEEKLY_CHALLENGES, snapshot)
}

/** The XP event a completed challenge instance should produce — idempotent via the same reconcile-by-id mechanism as other XP. */
export function buildChallengeCompletionEvent(progress: ChallengeProgress): XPEvent {
  const type: XPEventType = progress.challenge.period === 'daily' ? 'challenge_daily_complete' : 'challenge_weekly_complete'
  return {
    id: `challenge-${progress.instanceId}`,
    type,
    amount: progress.challenge.xpReward,
    date: progress.periodKey,
    sourceId: progress.instanceId,
    description: `Completed challenge: ${progress.challenge.name}`,
  }
}
