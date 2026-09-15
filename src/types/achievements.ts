import type { LucideIcon } from 'lucide-react'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: LucideIcon
  unlocked: boolean
  unlockedDate?: string
  xpReward: number
}

export interface Challenge {
  id: string
  title: string
  description: string
  progress: number
  goal: number
  unit: string
  daysLeft: number
  xpReward: number
}
