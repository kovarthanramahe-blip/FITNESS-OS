import { Check, Flame, Pencil, PowerOff, Trash2 } from 'lucide-react'
import { HABIT_ICONS } from '@/data/habitIcons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Habit, HabitEntry } from '@/types/habits'
import { getCurrentStreak, getHabitStatusForDate } from '@/utils/habits'
import { getTodayDateString } from '@/utils/dateRange'
import { cn } from '@/utils/cn'
import { HabitWeeklyStrip } from './HabitWeeklyStrip'

export interface HabitCardProps {
  habit: Habit
  entries: HabitEntry[]
  onComplete: (habit: Habit) => void
  onUncomplete: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onToggleActive: (habit: Habit) => void
  onDelete: (habit: Habit) => void
}

export function HabitCard({ habit, entries, onComplete, onUncomplete, onEdit, onToggleActive, onDelete }: HabitCardProps) {
  const Icon = HABIT_ICONS[habit.icon]
  const today = getTodayDateString()
  const status = getHabitStatusForDate(habit, entries, today)
  const streak = getCurrentStreak(habit, entries)

  return (
    <Card padding="md" className={cn(!habit.active && 'opacity-60')} data-testid={`habit-card-${habit.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{habit.name}</p>
            {habit.description && <p className="mt-0.5 text-xs text-text-secondary">{habit.description}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
              <span>
                Target: {habit.target}
                {habit.unit ? ` ${habit.unit}` : ''}
              </span>
              {habit.reminderEnabled && habit.reminderTime && <span>Reminder {habit.reminderTime}</span>}
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3.5 text-warning" />
                {streak} day streak
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={status === 'completed'}
          disabled={status === 'unscheduled' || status === 'inactive'}
          aria-label={
            status === 'unscheduled'
              ? `${habit.name} is not scheduled today`
              : status === 'inactive'
                ? `${habit.name} is inactive`
                : `Mark ${habit.name} as ${status === 'completed' ? 'not done' : 'done'} today`
          }
          onClick={() => (status === 'completed' ? onUncomplete(habit) : onComplete(habit))}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-ring-on-accent',
            status === 'completed'
              ? 'border-accent bg-accent text-text-inverse'
              : 'border-border text-transparent hover:border-border-strong',
            (status === 'unscheduled' || status === 'inactive') && 'cursor-not-allowed opacity-40 hover:border-border',
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </button>
      </div>

      <HabitWeeklyStrip habit={habit} entries={entries} className="mt-4" />

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-3">
        <Button variant="ghost" size="icon" aria-label={`Edit ${habit.name}`} onClick={() => onEdit(habit)}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={habit.active ? `Deactivate ${habit.name}` : `Activate ${habit.name}`}
          onClick={() => onToggleActive(habit)}
        >
          <PowerOff className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${habit.name}`} onClick={() => onDelete(habit)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
