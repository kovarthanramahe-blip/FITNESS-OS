import type { LucideIcon } from 'lucide-react'

export interface Habit {
  id: string
  name: string
  icon: LucideIcon
  color: 'accent' | 'secondary' | 'purple' | 'success' | 'warning'
  streak: number
  completedToday: boolean
  targetPerWeek: number
  completionsThisWeek: number
}
