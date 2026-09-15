import { Flame, Moon, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { DayActivityStatus, StreakSummary, WeekActivityDay } from '@/types/dashboard'
import { cn } from '@/utils/cn'

export interface StreakCardProps {
  streak: StreakSummary
  week: WeekActivityDay[]
  className?: string
}

const dotStyles: Record<DayActivityStatus, string> = {
  complete: 'bg-accent text-text-inverse border-accent',
  rest: 'bg-purple-soft text-purple border-transparent',
  missed: 'bg-transparent text-text-muted border-border',
  upcoming: 'bg-transparent text-text-muted border-border border-dashed',
}

const statusLabel: Record<DayActivityStatus, string> = {
  complete: 'workout completed',
  rest: 'planned rest day',
  missed: 'missed',
  upcoming: 'upcoming',
}

export function StreakCard({ streak, week, className }: StreakCardProps) {
  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-4', className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Flame className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-text-primary">{streak.days} day streak</p>
          <p className="text-xs text-text-muted">Planned rest days keep the streak alive</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1">
        {week.map((day) => (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              role="img"
              aria-label={`${day.day}: ${statusLabel[day.status]}`}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border',
                dotStyles[day.status],
              )}
            >
              {day.status === 'complete' && <Flame className="size-3.5" aria-hidden="true" />}
              {day.status === 'rest' && <Moon className="size-3.5" aria-hidden="true" />}
              {day.status === 'missed' && <X className="size-3.5" aria-hidden="true" />}
            </span>
            <span aria-hidden="true" className="text-[10px] text-text-muted">
              {day.day[0]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
