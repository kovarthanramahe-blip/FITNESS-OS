import { Flame } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { TodaysHabitsSummary } from '@/utils/habits'

export interface HabitsSummaryProps {
  summary: TodaysHabitsSummary
}

export function HabitsSummary({ summary }: HabitsSummaryProps) {
  return (
    <Card elevated padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-text-secondary">Today&rsquo;s Habits</p>
        <p className="mt-1 font-display text-2xl font-bold text-text-primary">
          {summary.completed} / {summary.scheduled} <span className="text-sm font-normal text-text-muted">completed</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted">
          <Flame className="size-3.5 text-warning" />
          Best current streak: {summary.bestCurrentStreak} {summary.bestCurrentStreak === 1 ? 'day' : 'days'}
        </p>
      </div>
      <div className="w-full sm:w-56">
        <ProgressBar value={summary.percent} max={100} color="accent" showValue label="Today's progress" />
      </div>
    </Card>
  )
}
