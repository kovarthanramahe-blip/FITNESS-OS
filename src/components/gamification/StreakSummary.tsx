import { Card, CardTitle } from '@/components/ui/Card'
import type { StreakSummaryItem } from '@/types/gamification'
import { cn } from '@/utils/cn'

const ICON_STYLES: Record<StreakSummaryItem['key'], string> = {
  workout: 'bg-warning/10 text-warning',
  water: 'bg-secondary-soft text-secondary',
  habits: 'bg-accent-soft text-accent',
}

export interface StreakSummaryProps {
  streaks: StreakSummaryItem[]
  className?: string
}

/**
 * A unified view over 3 distinct existing streak systems — each kept
 * clearly labeled with its own unit, never averaged into one number.
 */
export function StreakSummary({ streaks, className }: StreakSummaryProps) {
  return (
    <Card padding="md" className={cn('flex flex-col gap-3', className)}>
      <CardTitle>Streaks</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        {streaks.map((streak) => {
          const Icon = streak.icon
          return (
            <div
              key={streak.key}
              data-testid={`streak-${streak.key}`}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className={cn('flex size-10 items-center justify-center rounded-full', ICON_STYLES[streak.key])}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="font-display text-lg font-bold text-text-primary">{streak.value}</p>
              <p className="text-[11px] leading-tight text-text-muted">
                <span className="block">{streak.label}</span>
                <span className="block">{streak.unit}</span>
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
