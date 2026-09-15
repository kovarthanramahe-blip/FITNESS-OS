import {
  Award,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Crown,
  Droplets,
  Dumbbell,
  Flame,
  Medal,
  Scale,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { Badge, Challenge, LevelDefinition } from '@/types/gamification'

// ---------------------------------------------------------------------------
// XP constants — the single source of truth for how much each qualifying
// action is worth. Kept separate from the (mutable) XP event log itself.
// ---------------------------------------------------------------------------

export const XP_REWARDS = {
  workoutSessionComplete: 50,
  personalRecord: 100,
  nutritionLog: 10,
  nutritionDailyComplete: 25,
  habitComplete: 10,
  habitDailyTarget: 25,
  waterGoalReached: 20,
  weightLog: 10,
  bodyMeasurementLog: 10,
  dailyChallengeComplete: 30,
  weeklyChallengeComplete: 100,
} as const

// ---------------------------------------------------------------------------
// Level curve tiers — named ranges layered on top of the numeric curve in
// utils/gamification.ts. Levels past the last tier keep that tier's title.
// ---------------------------------------------------------------------------

export const LEVEL_TIERS: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Beginner' },
  { minLevel: 3, title: 'Novice' },
  { minLevel: 6, title: 'Committed' },
  { minLevel: 10, title: 'Consistency Builder' },
  { minLevel: 15, title: 'Dedicated' },
  { minLevel: 20, title: 'Disciplined' },
  { minLevel: 25, title: 'Athlete' },
  { minLevel: 30, title: 'Strong' },
  { minLevel: 35, title: 'Elite' },
  { minLevel: 40, title: 'Master' },
  { minLevel: 45, title: 'Champion' },
  { minLevel: 50, title: 'Legend' },
]

/** Explicit definitions for the tier-starting levels — the numeric curve covers every level in between and beyond. */
export const LEVEL_DEFINITIONS: LevelDefinition[] = LEVEL_TIERS.map((tier) => ({
  level: tier.minLevel,
  title: tier.title,
}))

// ---------------------------------------------------------------------------
// Badges — deterministic, calculable from existing store data only.
// Evaluation logic lives in utils/badgeEngine.ts; this is definition-only.
// ---------------------------------------------------------------------------

export const BADGES: Badge[] = [
  {
    id: 'first-workout',
    name: 'First Workout',
    description: 'Complete your first workout.',
    category: 'workout',
    icon: Dumbbell,
    requirement: 'Complete 1 workout',
    rarity: 'common',
  },
  {
    id: 'week-one',
    name: 'Week One',
    description: 'Complete workouts in your first week.',
    category: 'workout',
    icon: CalendarCheck,
    requirement: 'Complete 3 workouts within 7 days of your first',
    rarity: 'uncommon',
  },
  {
    id: 'pr-club',
    name: 'PR Club',
    description: 'Set your first personal record.',
    category: 'strength',
    icon: Trophy,
    requirement: 'Set 1 personal record',
    rarity: 'common',
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    description: 'Set 5 personal records.',
    category: 'strength',
    icon: Flame,
    requirement: 'Set 5 personal records',
    rarity: 'rare',
  },
  {
    id: 'nutrition-logger',
    name: 'Nutrition Logger',
    description: 'Log nutrition on 7 different days.',
    category: 'nutrition',
    icon: ClipboardList,
    requirement: 'Log food on 7 different days',
    rarity: 'uncommon',
  },
  {
    id: 'macro-master',
    name: 'Macro Master',
    description: 'Log nutrition on 30 different days.',
    category: 'nutrition',
    icon: ClipboardList,
    requirement: 'Log food on 30 different days',
    rarity: 'epic',
  },
  {
    id: 'hydrated',
    name: 'Hydrated',
    description: 'Reach your water goal 7 times.',
    category: 'hydration',
    icon: Droplets,
    requirement: 'Reach your water goal on 7 days',
    rarity: 'uncommon',
  },
  {
    id: 'hydration-hero',
    name: 'Hydration Hero',
    description: 'Reach your water goal 30 times.',
    category: 'hydration',
    icon: Droplets,
    requirement: 'Reach your water goal on 30 days',
    rarity: 'epic',
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Complete habits for 7 consecutive scheduled days.',
    category: 'consistency',
    icon: CheckCircle2,
    requirement: 'Reach a 7-day habit consistency streak',
    rarity: 'rare',
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Complete habits for 30 consecutive scheduled days.',
    category: 'consistency',
    icon: Flame,
    requirement: 'Reach a 30-day habit consistency streak',
    rarity: 'epic',
  },
  {
    id: 'weight-tracker',
    name: 'Weight Tracker',
    description: 'Log weight on 10 different days.',
    category: 'progress',
    icon: Scale,
    requirement: 'Log weight on 10 different days',
    rarity: 'uncommon',
  },
  {
    id: 'transformation',
    name: 'Transformation',
    description: 'Log weight on 30 different days.',
    category: 'progress',
    icon: TrendingUp,
    requirement: 'Log weight on 30 different days',
    rarity: 'epic',
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Complete 100 workout sets.',
    category: 'milestones',
    icon: Medal,
    requirement: 'Complete 100 total workout sets',
    rarity: 'rare',
  },
  {
    id: 'level-10',
    name: 'Level 10',
    description: 'Reach level 10.',
    category: 'milestones',
    icon: Star,
    requirement: 'Reach level 10',
    rarity: 'common',
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Keep an 8-week workout streak.',
    category: 'milestones',
    icon: Crown,
    requirement: 'Reach an 8-week workout streak',
    rarity: 'legendary',
  },
]

export const BADGES_BY_ID: Record<string, Badge> = Object.fromEntries(
  BADGES.map((badge) => [badge.id, badge]),
)

// Referenced for the "recent XP" display fallback icon and dashboard summaries.
export const GAMIFICATION_XP_ICON = Award

// ---------------------------------------------------------------------------
// Challenge templates — reusable definitions; concrete progress is always
// derived live from existing store data (see utils/challengeEngine.ts).
// ---------------------------------------------------------------------------

export const DAILY_CHALLENGES: Challenge[] = [
  {
    id: 'daily-workout',
    name: "Complete a workout today",
    description: 'Finish today’s scheduled workout.',
    period: 'daily',
    metric: 'workout_count',
    target: 1,
    xpReward: 30,
    requiresScheduledActivity: true,
  },
  {
    id: 'daily-habits',
    name: 'Complete 4 habits today',
    description: 'Check off 4 of your scheduled habits today.',
    period: 'daily',
    metric: 'habit_completion',
    target: 4,
    xpReward: 30,
    requiresScheduledActivity: true,
  },
  {
    id: 'daily-water',
    name: "Reach your water goal today",
    description: 'Hit your daily water target.',
    period: 'daily',
    metric: 'water_goal_days',
    target: 1,
    xpReward: 30,
    requiresScheduledActivity: false,
  },
  {
    id: 'daily-nutrition',
    name: 'Log 3 meals today',
    description: 'Log food for 3 different meals today.',
    period: 'daily',
    metric: 'nutrition_logging_days',
    target: 3,
    xpReward: 30,
    requiresScheduledActivity: false,
  },
  {
    id: 'daily-weight',
    name: "Log today's weight",
    description: 'Add a weight entry for today.',
    period: 'daily',
    metric: 'weight_logging_days',
    target: 1,
    xpReward: 30,
    requiresScheduledActivity: false,
  },
]

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: 'weekly-workouts',
    name: 'Complete 3 workouts this week',
    description: 'Finish 3 workout sessions this week.',
    period: 'weekly',
    metric: 'workout_count',
    target: 3,
    xpReward: 100,
    requiresScheduledActivity: false,
  },
  {
    id: 'weekly-habits',
    name: 'Complete 80% of scheduled habits',
    description: 'Hit 80% of this week’s scheduled habit completions.',
    period: 'weekly',
    metric: 'habit_completion',
    target: 80,
    xpReward: 100,
    requiresScheduledActivity: false,
  },
  {
    id: 'weekly-water',
    name: 'Reach your water goal 5 times',
    description: 'Hit your daily water target on 5 days this week.',
    period: 'weekly',
    metric: 'water_goal_days',
    target: 5,
    xpReward: 100,
    requiresScheduledActivity: false,
  },
  {
    id: 'weekly-nutrition',
    name: 'Log nutrition on 6 days',
    description: 'Log food on 6 different days this week.',
    period: 'weekly',
    metric: 'nutrition_logging_days',
    target: 6,
    xpReward: 100,
    requiresScheduledActivity: false,
  },
  {
    id: 'weekly-pr',
    name: 'Set a new PR',
    description: 'Set at least 1 new personal record this week.',
    period: 'weekly',
    metric: 'pr_count',
    target: 1,
    xpReward: 100,
    requiresScheduledActivity: false,
  },
]

export const CHALLENGE_TEMPLATES: Challenge[] = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES]
