import {
  Dumbbell,
  Home,
  LineChart,
  ListChecks,
  Settings,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  label: string
  path: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Workout', path: '/workout', icon: Dumbbell },
  { label: 'Nutrition', path: '/nutrition', icon: UtensilsCrossed },
  { label: 'Progress', path: '/progress', icon: LineChart },
  { label: 'Habits', path: '/habits', icon: ListChecks },
  { label: 'Achievements', path: '/achievements', icon: Trophy },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export const PRIMARY_MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5)
