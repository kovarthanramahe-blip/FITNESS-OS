import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { WeekdayActivity } from '@/utils/progress'
import { cn } from '@/utils/cn'

export interface WeeklyFrequencyStripProps {
  week: WeekdayActivity[]
}

/** Rest days render as a neutral empty pill — never as a missed or failed day. */
export function WeeklyFrequencyStrip({ week }: WeeklyFrequencyStripProps) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-7 gap-2">
        {week.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted">{day.day}</span>
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full text-xs font-medium',
                day.hasWorkout ? 'bg-accent text-background' : 'bg-surface-elevated text-text-muted',
              )}
              aria-label={day.hasWorkout ? `Trained on ${day.day}` : `No workout logged on ${day.day}`}
            >
              {new Date(day.date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
