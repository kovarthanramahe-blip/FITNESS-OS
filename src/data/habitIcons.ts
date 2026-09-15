import {
  Beef,
  Bell,
  CheckCircle,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Moon,
  Pill,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HabitIconKey } from '@/types/habits'

/** Maps a persisted, serializable icon key to its Lucide component. */
export const HABIT_ICONS: Record<HabitIconKey, LucideIcon> = {
  droplets: Droplets,
  pill: Pill,
  dumbbell: Dumbbell,
  footprints: Footprints,
  moon: Moon,
  beef: Beef,
  utensils: UtensilsCrossed,
  heart: Heart,
  sparkles: Sparkles,
  bell: Bell,
  checkCircle: CheckCircle,
}

export const HABIT_ICON_KEYS: HabitIconKey[] = Object.keys(HABIT_ICONS) as HabitIconKey[]
