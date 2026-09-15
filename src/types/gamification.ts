import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

/**
 * Every distinct kind of action that can earn XP. Each type has a single,
 * deterministic source of truth for the events it can produce (see
 * utils/gamification.ts `deriveEligibleXpEvents`) so the same real-world
 * action always maps to the same stable event id.
 */
export type XPEventType =
  | 'workout_session_complete'
  | 'personal_record'
  | 'nutrition_log'
  | 'nutrition_daily_complete'
  | 'habit_complete'
  | 'habit_daily_target'
  | 'water_goal_reached'
  | 'weight_log'
  | 'body_measurement_log'
  | 'challenge_daily_complete'
  | 'challenge_weekly_complete'

/**
 * One entry in the XP audit trail. `id` is a stable, source-derived key
 * (e.g. `workout-session-${historyEntryId}`) — never a random id — so the
 * same qualifying action can only ever produce one XPEvent, regardless of
 * how many times it's recomputed. This is what makes XP idempotent: a
 * sync pass recomputes the full *eligible* set from current data and only
 * appends events whose id isn't already recorded.
 */
export interface XPEvent {
  id: string
  type: XPEventType
  amount: number
  /** ISO date (yyyy-mm-dd) or timestamp the underlying action occurred on. */
  date: string
  /** Id of the record that earned this XP (history entry, habit entry, etc). */
  sourceId: string
  /** Human-readable audit trail text, e.g. "Completed workout". */
  description: string
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export interface LevelDefinition {
  level: number
  title: string
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export type BadgeCategory =
  | 'workout'
  | 'strength'
  | 'nutrition'
  | 'hydration'
  | 'consistency'
  | 'progress'
  | 'milestones'

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * A badge definition. Never persisted directly — only its id is stored
 * (see EarnedBadge) — so `icon` can safely hold a live component
 * reference rather than a serializable key.
 */
export interface Badge {
  id: string
  name: string
  description: string
  category: BadgeCategory
  icon: LucideIcon
  /** Human-readable requirement text shown in the UI, e.g. "Complete your first workout." */
  requirement: string
  rarity: BadgeRarity
}

/** The persisted record of a badge having been earned — just an id + timestamp. */
export interface EarnedBadge {
  badgeId: string
  /** ISO timestamp the badge was earned. */
  earnedAt: string
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export type ChallengePeriod = 'daily' | 'weekly'

/**
 * The typed measure a challenge tracks progress against — avoids
 * arbitrary string-keyed logic; each type has one evaluator in
 * utils/challengeEngine.ts.
 */
export type ChallengeMetric =
  | 'workout_count'
  | 'habit_completion'
  | 'water_goal_days'
  | 'nutrition_logging_days'
  | 'weight_logging_days'
  | 'pr_count'
  | 'volume_target'

/** A reusable challenge definition (seed data) — never mutable user state. */
export interface Challenge {
  id: string
  name: string
  description: string
  period: ChallengePeriod
  metric: ChallengeMetric
  target: number
  xpReward: number
  /**
   * When false, this challenge only appears/instantiates on days the
   * relevant activity is actually scheduled (e.g. a workout challenge is
   * skipped entirely on a rest day) — see utils/challengeEngine.ts.
   */
  requiresScheduledActivity: boolean
}

/** A concrete instance of a Challenge for one day/week, with live progress. */
export interface ChallengeProgress {
  /** Stable id for this instance, e.g. `${challengeId}-${dateKey}`. */
  instanceId: string
  challenge: Challenge
  /** The date (daily) or week-start date (weekly) this instance covers. */
  periodKey: string
  current: number
  target: number
  /** 0-100, never above 100. */
  percent: number
  completed: boolean
  remaining: number
}

// ---------------------------------------------------------------------------
// Profile / stats
// ---------------------------------------------------------------------------

export interface GamificationProfile {
  totalXp: number
  currentLevel: number
  /** ISO timestamp — when the gamification profile was first created. */
  createdAt: string
}

export type AchievementCategory = 'all' | 'earned' | 'locked' | BadgeCategory

export interface StreakSummaryItem {
  key: 'workout' | 'water' | 'habits'
  label: string
  value: number
  unit: string
  icon: LucideIcon
}

export interface GamificationStats {
  profile: GamificationProfile
  xpIntoLevel: number
  xpForNextLevel: number
  levelProgressPercent: number
  levelTitle: string
  recentEvents: XPEvent[]
  earnedBadges: (Badge & { earnedAt: string })[]
  lockedBadges: Badge[]
  dailyChallenges: ChallengeProgress[]
  weeklyChallenges: ChallengeProgress[]
  streaks: StreakSummaryItem[]
}
