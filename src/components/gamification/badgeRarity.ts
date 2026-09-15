import type { BadgeVariant } from '@/components/ui/Badge'
import type { BadgeRarity } from '@/types/gamification'

/**
 * Rarity is shown with both a label and a color — text carries the meaning,
 * color is a subtle reinforcement, never the only signal (see Achievements
 * page accessibility requirements).
 */
export const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

export const RARITY_BADGE_VARIANT: Record<BadgeRarity, BadgeVariant> = {
  common: 'neutral',
  uncommon: 'secondary',
  rare: 'purple',
  epic: 'warning',
  legendary: 'accent',
}

export const RARITY_ICON_STYLES: Record<BadgeRarity, string> = {
  common: 'bg-surface-elevated text-text-secondary',
  uncommon: 'bg-secondary-soft text-secondary',
  rare: 'bg-purple-soft text-purple',
  epic: 'bg-warning/10 text-warning',
  legendary: 'bg-accent-soft text-accent',
}

export const BADGE_CATEGORY_LABELS: Record<string, string> = {
  workout: 'Workout',
  strength: 'Strength',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  consistency: 'Consistency',
  progress: 'Progress',
  milestones: 'Milestones',
}
