import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useCountUp } from '@/hooks/useCountUp'
import type { DailyScoreData } from '@/types/dashboard'
import { getScoreLabel } from '@/utils/dashboard'
import { cn } from '@/utils/cn'

export interface DailyScoreCardProps {
  data: DailyScoreData
  className?: string
}

export function DailyScoreCard({ data, className }: DailyScoreCardProps) {
  const animatedScore = useCountUp(data.score)

  return (
    <Card elevated padding="lg" animate={false} className={cn('flex h-full items-center gap-6', className)}>
      <ProgressRing value={data.score} max={data.max} size={110} strokeWidth={9} color="accent">
        <div className="text-center">
          <p className="font-display text-3xl font-bold tabular-nums text-text-primary">
            {Math.round(animatedScore)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-text-muted">/ {data.max}</p>
        </div>
      </ProgressRing>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-secondary">Daily Fitness Score</p>
        <p className="mt-1 font-display text-lg font-semibold text-accent">{getScoreLabel(data.score, data.max)}</p>
        <p className="mt-1 text-xs text-text-muted">Workout, nutrition &amp; habits combined</p>
      </div>
    </Card>
  )
}
