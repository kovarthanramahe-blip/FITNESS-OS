import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { NutrientSummary } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { getRemaining } from '@/utils/dashboard'
import { formatNumber } from '@/utils/format'

export interface NutrientProgressCardProps {
  data: NutrientSummary
  icon: LucideIcon
  color: 'accent' | 'secondary' | 'purple'
  className?: string
}

const iconAccent: Record<NutrientProgressCardProps['color'], string> = {
  accent: 'bg-accent-soft text-accent',
  secondary: 'bg-secondary-soft text-secondary',
  purple: 'bg-purple-soft text-purple',
}

export function NutrientProgressCard({ data, icon: Icon, color, className }: NutrientProgressCardProps) {
  const remaining = getRemaining(data.consumed, data.target)

  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{data.label}</p>
        <span className={cn('flex size-8 items-center justify-center rounded-full', iconAccent[color])}>
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-text-primary">
        <span>{formatNumber(data.consumed)}</span>
        <span className="text-sm font-normal text-text-muted">
          {' '}
          / {formatNumber(data.target)} {data.unit}
        </span>
      </p>
      <ProgressBar value={data.consumed} max={data.target} color={color} size="sm" />
      <p className="text-xs text-text-muted">
        {remaining > 0 ? `${formatNumber(remaining)} ${data.unit} remaining` : 'Target reached'}
      </p>
    </Card>
  )
}
