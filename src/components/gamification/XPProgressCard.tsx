import type { GamificationStats } from '@/types/gamification'
import { LevelProgress } from './LevelProgress'

export interface XPProgressCardProps {
  stats: GamificationStats
  className?: string
}

/** Adapts the GamificationStats read model to LevelProgress's props — the single place Dashboard/Achievements both go through for the level/XP card. */
export function XPProgressCard({ stats, className }: XPProgressCardProps) {
  return (
    <LevelProgress
      level={stats.profile.currentLevel}
      xp={stats.xpIntoLevel}
      xpToNextLevel={stats.xpForNextLevel}
      title={stats.levelTitle}
      className={className}
    />
  )
}
