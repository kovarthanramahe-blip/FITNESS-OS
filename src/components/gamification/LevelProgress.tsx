import { Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'

export interface LevelProgressProps {
  level: number
  xp: number
  xpToNextLevel: number
  className?: string
}

/**
 * Reusable level/XP summary — used on the dashboard today and intended for
 * the Achievements/gamification screens later.
 */
export function LevelProgress({ level, xp, xpToNextLevel, className }: LevelProgressProps) {
  const animatedXp = useCountUp(xp)
  const remaining = Math.max(xpToNextLevel - xp, 0)

  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Level Progress</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-purple-soft text-purple">
          <Zap className="size-4" strokeWidth={2.25} />
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-text-primary">
        <span>Level {level}</span>
        <span className="ml-2 text-sm font-normal tabular-nums text-text-muted">
          {formatNumber(Math.round(animatedXp))} XP
        </span>
      </p>
      <ProgressBar value={xp} max={xpToNextLevel} color="purple" size="sm" />
      <p className="text-xs text-text-muted">{formatNumber(remaining)} XP to next level</p>
    </Card>
  )
}
