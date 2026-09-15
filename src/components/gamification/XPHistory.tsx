import { Zap } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { XPEvent } from '@/types/gamification'
import { cn } from '@/utils/cn'

export interface XPHistoryProps {
  events: XPEvent[]
  /** Shows fewer rows with tighter spacing, e.g. for a dashboard card. */
  compact?: boolean
  className?: string
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
}

export function XPHistory({ events, compact = false, className }: XPHistoryProps) {
  const visible = compact ? events.slice(0, 3) : events

  return (
    <Card padding="md" className={cn('flex flex-col gap-3', className)}>
      <CardTitle>Recent XP</CardTitle>
      {visible.length === 0 ? (
        <EmptyState icon={Zap} title="No XP yet" description="Complete a workout, log a meal or hit your water goal to start earning XP." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className={cn('font-medium text-text-primary', compact ? 'text-xs' : 'text-sm')}>{event.description}</p>
                <p className="text-[11px] text-text-muted">{formatEventDate(event.date)}</p>
              </div>
              <span className={cn('shrink-0 font-semibold tabular-nums text-accent', compact ? 'text-xs' : 'text-sm')}>
                +{event.amount} XP
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
