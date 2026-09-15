import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DashboardHabit } from '@/types/dashboard'
import { cn } from '@/utils/cn'

export interface HabitsCardProps {
  habits: DashboardHabit[]
  className?: string
}

export function HabitsCard({ habits: initialHabits, className }: HabitsCardProps) {
  const [habits, setHabits] = useState(initialHabits)

  function toggleHabit(id: string) {
    setHabits((current) =>
      current.map((habit) => (habit.id === id ? { ...habit, completed: !habit.completed } : habit)),
    )
  }

  const completedCount = habits.filter((habit) => habit.completed).length

  return (
    <Card padding="lg" className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Daily Habits</CardTitle>
          <p className="mt-0.5 text-xs text-text-muted">
            {completedCount} of {habits.length} done today
          </p>
        </div>
        <Link to="/habits" className="shrink-0 text-xs font-medium text-accent hover:underline">
          View all
        </Link>
      </CardHeader>
      <ul className="flex flex-1 flex-col divide-y divide-border">
        {habits.map((habit) => (
          <li key={habit.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                habit.completed ? 'bg-accent-soft text-accent' : 'bg-surface-elevated text-text-muted',
              )}
            >
              <habit.icon className="size-4" />
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                habit.completed ? 'text-text-muted line-through' : 'text-text-primary',
              )}
            >
              {habit.label}
            </span>
            <button
              type="button"
              role="checkbox"
              aria-checked={habit.completed}
              aria-label={`Mark ${habit.label} as ${habit.completed ? 'not done' : 'done'}`}
              onClick={() => toggleHabit(habit.id)}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                habit.completed
                  ? 'border-accent bg-accent text-text-inverse'
                  : 'border-border text-transparent hover:border-border-strong',
              )}
            >
              <motion.span
                initial={false}
                animate={{ scale: habit.completed ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
