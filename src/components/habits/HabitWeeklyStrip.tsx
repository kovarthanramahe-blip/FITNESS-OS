import { Check } from 'lucide-react'
import type { Habit, HabitEntry } from '@/types/habits'
import { getWeeklyStrip } from '@/utils/habits'
import { cn } from '@/utils/cn'
import { parseDateOnly } from '@/utils/dateRange'

export interface HabitWeeklyStripProps {
  habit: Habit
  entries: HabitEntry[]
  className?: string
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatDayLabel(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

/**
 * A compact Mon-Sun view of one habit's status: completed (✓), scheduled but
 * incomplete (○), or not scheduled (—). Never labels an unscheduled day as
 * missed — colour alone never carries the distinction either, since each
 * state also gets its own glyph.
 */
export function HabitWeeklyStrip({ habit, entries, className }: HabitWeeklyStripProps) {
  const week = getWeeklyStrip(habit, entries)

  return (
    <div className={cn('flex items-center justify-between gap-1', className)}>
      {week.map((day, index) => (
        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-[10px] font-medium',
              day.status === 'completed' && 'bg-accent text-background',
              day.status === 'pending' && 'border border-border-strong text-text-muted',
              (day.status === 'unscheduled' || day.status === 'inactive') && 'text-text-muted/50',
            )}
            aria-label={`${formatDayLabel(day.date)}: ${
              day.status === 'completed'
                ? 'completed'
                : day.status === 'pending'
                  ? 'scheduled, not yet completed'
                  : day.status === 'inactive'
                    ? 'habit inactive'
                    : 'not scheduled'
            }`}
          >
            {day.status === 'completed' ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : day.status === 'pending' ? (
              <span aria-hidden="true">○</span>
            ) : (
              <span aria-hidden="true">—</span>
            )}
          </span>
          <span className="text-[10px] text-text-muted">{WEEKDAY_LABELS[index]}</span>
        </div>
      ))}
    </div>
  )
}
