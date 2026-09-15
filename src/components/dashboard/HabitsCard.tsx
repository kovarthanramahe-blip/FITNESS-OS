import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HABIT_ICONS } from '@/data/habitIcons'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { completeHabit, uncompleteHabit } from '@/lib/habitStore'
import type { Habit, HabitEntry } from '@/types/habits'
import { getHabitStatusForDate, getTodaysHabitsSummary } from '@/utils/habits'
import { getTodayDateString } from '@/utils/dateRange'
import { cn } from '@/utils/cn'

export interface HabitsCardProps {
  habits: Habit[]
  entries: HabitEntry[]
  className?: string
}

const MAX_SHOWN = 5

/** Reads live habitStore state and writes back to it directly — no separate Dashboard-local habit state. */
export function HabitsCard({ habits, entries, className }: HabitsCardProps) {
  const today = getTodayDateString()
  const summary = getTodaysHabitsSummary(habits, entries)

  const scheduledToday = habits
    .filter((habit) => getHabitStatusForDate(habit, entries, today) !== 'unscheduled' && habit.active)
    .sort((a, b) => {
      const aPending = getHabitStatusForDate(a, entries, today) === 'pending'
      const bPending = getHabitStatusForDate(b, entries, today) === 'pending'
      return aPending === bPending ? 0 : aPending ? -1 : 1
    })
    .slice(0, MAX_SHOWN)

  return (
    <Card padding="lg" className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Daily Habits</CardTitle>
          <p className="mt-0.5 text-xs text-text-muted">
            {summary.completed} of {summary.scheduled} done today
          </p>
        </div>
        <Link to="/habits" className="shrink-0 text-xs font-medium text-accent hover:underline">
          View all
        </Link>
      </CardHeader>

      <div className="mb-3">
        <ProgressBar value={summary.percent} max={100} color="accent" size="sm" />
      </div>

      {scheduledToday.length === 0 ? (
        <EmptyState title="No habits scheduled today" className="py-6" />
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border">
          {scheduledToday.map((habit) => {
            const Icon = HABIT_ICONS[habit.icon]
            const completed = getHabitStatusForDate(habit, entries, today) === 'completed'
            return (
              <li key={habit.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    completed ? 'bg-accent-soft text-accent' : 'bg-surface-elevated text-text-muted',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    completed ? 'text-text-muted line-through' : 'text-text-primary',
                  )}
                >
                  {habit.name}
                </span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={completed}
                  aria-label={`Mark ${habit.name} as ${completed ? 'not done' : 'done'}`}
                  onClick={() => (completed ? uncompleteHabit(habit.id) : completeHabit(habit.id))}
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                    completed
                      ? 'border-accent bg-accent text-text-inverse'
                      : 'border-border text-transparent hover:border-border-strong',
                  )}
                >
                  <motion.span initial={false} animate={{ scale: completed ? 1 : 0 }} transition={{ duration: 0.15 }}>
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
