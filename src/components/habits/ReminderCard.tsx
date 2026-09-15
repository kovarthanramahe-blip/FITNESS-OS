import { Check, Pencil, PowerOff, Trash2 } from 'lucide-react'
import { HABIT_ICONS } from '@/data/habitIcons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { HabitEntry, Reminder } from '@/types/habits'
import { getHabitStatusForDate } from '@/utils/habits'
import { describeSchedule } from '@/utils/habitSchedule'
import { getTodayDateString } from '@/utils/dateRange'
import { cn } from '@/utils/cn'

export interface ReminderCardProps {
  reminder: Reminder
  entries: HabitEntry[]
  onComplete: (reminder: Reminder) => void
  onUncomplete: (reminder: Reminder) => void
  onEdit: (reminder: Reminder) => void
  onToggleActive: (reminder: Reminder) => void
  onDelete: (reminder: Reminder) => void
}

export function ReminderCard({ reminder, entries, onComplete, onUncomplete, onEdit, onToggleActive, onDelete }: ReminderCardProps) {
  const Icon = HABIT_ICONS[reminder.icon]
  const status = getHabitStatusForDate(reminder, entries, getTodayDateString())

  return (
    <Card
      padding="md"
      className={cn('flex items-center gap-3', !reminder.active && 'opacity-60')}
      data-testid={`reminder-card-${reminder.id}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-soft text-purple">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{reminder.name}</p>
        <p className="text-xs text-text-muted">
          {describeSchedule(reminder.frequency)}
          {reminder.reminderTime ? ` · ${reminder.reminderTime}` : ''}
          {!reminder.active ? ' · Inactive' : ''}
        </p>
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={status === 'completed'}
        disabled={status === 'unscheduled' || status === 'inactive'}
        aria-label={
          status === 'unscheduled'
            ? `${reminder.name} is not scheduled today`
            : status === 'inactive'
              ? `${reminder.name} is inactive`
              : `Mark ${reminder.name} as ${status === 'completed' ? 'not done' : 'done'} today`
        }
        onClick={() => (status === 'completed' ? onUncomplete(reminder) : onComplete(reminder))}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-ring-on-accent',
          status === 'completed'
            ? 'border-accent bg-accent text-text-inverse'
            : 'border-border text-transparent hover:border-border-strong',
          (status === 'unscheduled' || status === 'inactive') && 'cursor-not-allowed opacity-40 hover:border-border',
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon" aria-label={`Edit ${reminder.name}`} onClick={() => onEdit(reminder)}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={reminder.active ? `Deactivate ${reminder.name}` : `Activate ${reminder.name}`}
          onClick={() => onToggleActive(reminder)}
        >
          <PowerOff className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${reminder.name}`} onClick={() => onDelete(reminder)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
