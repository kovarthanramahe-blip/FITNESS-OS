import { motion } from 'framer-motion'
import { Check, Flame } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { mockHabits } from '@/data/mockHabits'
import type { Habit } from '@/types/habits'
import { cn } from '@/utils/cn'

const colorDot: Record<Habit['color'], string> = {
  accent: 'bg-accent',
  secondary: 'bg-secondary',
  purple: 'bg-purple',
  success: 'bg-success',
  warning: 'bg-warning',
}

const colorText: Record<Habit['color'], string> = {
  accent: 'text-accent bg-accent-soft',
  secondary: 'text-secondary bg-secondary-soft',
  purple: 'text-purple bg-purple-soft',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
}

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>(mockHabits)

  function toggleHabit(id: string) {
    setHabits((current) =>
      current.map((habit) =>
        habit.id !== id
          ? habit
          : {
              ...habit,
              completedToday: !habit.completedToday,
              completionsThisWeek: habit.completedToday
                ? Math.max(habit.completionsThisWeek - 1, 0)
                : Math.min(habit.completionsThisWeek + 1, 7),
            },
      ),
    )
  }

  const completedToday = habits.filter((habit) => habit.completedToday).length

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Habits</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {completedToday} of {habits.length} completed today
          </p>
        </div>
        <div className="w-full sm:w-56">
          <ProgressBar value={completedToday} max={habits.length} color="accent" />
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2">
        {habits.map((habit) => (
          <Card key={habit.id} padding="md" animate={false}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn('flex size-10 items-center justify-center rounded-full', colorText[habit.color])}>
                  <habit.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{habit.name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-muted">
                    <Flame className="size-3.5 text-warning" />
                    {habit.streak} day streak
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={habit.completedToday}
                aria-label={`Mark ${habit.name} as ${habit.completedToday ? 'not done' : 'done'} today`}
                onClick={() => toggleHabit(habit.id)}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                  habit.completedToday
                    ? 'border-accent bg-accent text-text-inverse'
                    : 'border-border text-transparent hover:border-border-strong',
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-1">
              {WEEK_LABELS.map((label, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      index < habit.completionsThisWeek ? colorDot[habit.color] : 'bg-surface-elevated',
                    )}
                  />
                  <span className="text-[10px] text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  )
}
