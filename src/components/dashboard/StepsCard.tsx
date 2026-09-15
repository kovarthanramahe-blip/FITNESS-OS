import { Footprints } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { StepsSummary } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { clamp, formatNumber } from '@/utils/format'

export interface StepsCardProps {
  data: StepsSummary
  className?: string
}

export function StepsCard({ data, className }: StepsCardProps) {
  const percent = Math.round(clamp((data.steps / data.target) * 100, 0, 100))

  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Steps</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-purple-soft text-purple">
          <Footprints className="size-4" strokeWidth={2.25} />
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-text-primary">
        {formatNumber(data.steps)}
        <span className="text-sm font-normal text-text-muted"> / {formatNumber(data.target)}</span>
      </p>
      <ProgressBar value={data.steps} max={data.target} color="purple" size="sm" />
      <p className="text-xs text-text-muted">{percent}% of daily goal</p>
    </Card>
  )
}
