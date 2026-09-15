import { Scale } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MiniTrend } from './MiniTrend'
import type { WeightSummary } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { getWeightTrendStatus } from '@/utils/dashboard'

export interface WeightCardProps {
  data: WeightSummary
  /** False when the user has no weight logs yet — shows an empty state instead of a fabricated 0 kg reading. */
  hasData?: boolean
  className?: string
}

const statusText: Record<ReturnType<typeof getWeightTrendStatus>, string> = {
  positive: 'text-success',
  negative: 'text-warning',
  neutral: 'text-text-muted',
}

const statusStroke: Record<ReturnType<typeof getWeightTrendStatus>, string> = {
  positive: 'stroke-success',
  negative: 'stroke-warning',
  neutral: 'stroke-text-muted',
}

export function WeightCard({ data, hasData = true, className }: WeightCardProps) {
  const status = getWeightTrendStatus(data.changeKg, data.currentKg, data.targetKg)
  const arrow = data.changeKg < 0 ? '↓' : data.changeKg > 0 ? '↑' : '–'

  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Current Weight</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Scale className="size-4" strokeWidth={2.25} />
        </span>
      </div>
      {hasData ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold text-text-primary">{data.currentKg.toFixed(1)} kg</p>
              <p className={cn('mt-1 text-xs font-medium', statusText[status])}>
                {arrow} {Math.abs(data.changeKg).toFixed(1)} kg {data.changePeriodLabel}
              </p>
            </div>
            <MiniTrend values={data.trend} strokeClassName={statusStroke[status]} />
          </div>
          <p className="text-xs text-text-muted">Target {data.targetKg.toFixed(1)} kg</p>
        </>
      ) : (
        <EmptyState title="No weight recorded yet" description="Log your first weigh-in on the Progress page." className="flex-1 justify-center py-4" />
      )}
    </Card>
  )
}
