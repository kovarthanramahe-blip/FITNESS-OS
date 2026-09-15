import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  label: string
  value: string
  unit?: string
  icon?: LucideIcon
  trend?: { value: string; direction: 'up' | 'down' }
  accent?: 'accent' | 'secondary' | 'purple'
  className?: string
}

const accentStyles = {
  accent: 'text-accent bg-accent-soft',
  secondary: 'text-secondary bg-secondary-soft',
  purple: 'text-purple bg-purple-soft',
}

export function StatCard({ label, value, unit, icon: Icon, trend, accent = 'accent', className }: StatCardProps) {
  return (
    <Card padding="md" className={cn('min-w-0', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-text-secondary">{label}</p>
        {Icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', accentStyles[accent])}>
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-text-primary">{value}</span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-medium',
            trend.direction === 'up' ? 'text-success' : 'text-danger',
          )}
        >
          {trend.direction === 'up' ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          {trend.value}
        </div>
      )}
    </Card>
  )
}
