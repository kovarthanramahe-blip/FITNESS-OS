import { Award } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { GamificationStats } from '@/types/gamification'
import { StreakSummary } from './StreakSummary'
import { XPProgressCard } from './XPProgressCard'

export interface GamificationOverviewProps {
  stats: GamificationStats
}

/** The Achievements page's top section: level/XP, streaks and a badge count — the "at a glance" gamification summary. */
export function GamificationOverview({ stats }: GamificationOverviewProps) {
  const totalBadges = stats.earnedBadges.length + stats.lockedBadges.length

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <XPProgressCard stats={stats} />
      <StreakSummary streaks={stats.streaks} />
      <Card elevated padding="lg" className="flex items-center gap-4" animate={false}>
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Award className="size-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-text-secondary">Badges Unlocked</p>
          <p className="font-display text-2xl font-bold text-text-primary">
            {stats.earnedBadges.length}
            <span className="text-sm font-normal text-text-muted"> / {totalBadges}</span>
          </p>
        </div>
      </Card>
    </div>
  )
}
