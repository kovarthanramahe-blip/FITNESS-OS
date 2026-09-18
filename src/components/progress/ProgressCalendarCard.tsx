import { Activity, ChevronLeft, ChevronRight, Droplets, Footprints, ListChecks, Scale } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useNutritionStore } from '@/lib/nutritionStore'
import { useProgressCalendar } from '@/hooks/useProgressCalendar'
import { parseDateOnly } from '@/utils/dateRange'
import { mlToLiters } from '@/utils/nutrition'
import type { CalendarDayActivity } from '@/utils/progressCalendar'
import { cn } from '@/utils/cn'

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const INDICATORS: {
  key: 'workout' | 'weight' | 'nutrition' | 'water' | 'habits'
  dotClassName: string
  label: string
  present: (activity: CalendarDayActivity) => boolean
}[] = [
  { key: 'workout', dotClassName: 'bg-accent', label: 'Workout', present: (a) => a.workout },
  { key: 'weight', dotClassName: 'bg-secondary', label: 'Weight', present: (a) => a.weightKg !== null },
  { key: 'nutrition', dotClassName: 'bg-purple', label: 'Nutrition', present: (a) => a.nutrition !== null },
  { key: 'water', dotClassName: 'bg-warning', label: 'Water', present: (a) => a.waterMl !== null },
  { key: 'habits', dotClassName: 'bg-success', label: 'Habits', present: (a) => a.habits !== null },
]

function formatMonthDay(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

function formatWeekdayDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function describeActivity(dateStr: string, activity: CalendarDayActivity, isToday: boolean): string {
  const present = INDICATORS.filter((indicator) => indicator.present(activity)).map((indicator) => indicator.label)
  const summary = present.length > 0 ? `Activity logged: ${present.join(', ')}.` : 'No activity logged.'
  const prefix = isToday ? 'Today, ' : ''
  return `${prefix}${formatWeekdayDate(dateStr)}. ${summary}`
}

export function ProgressCalendarCard() {
  const { monthLabel, grid, today, goToPreviousMonth, goToNextMonth, getActivity } = useProgressCalendar()
  const { waterGoal } = useNutritionStore()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const selectedActivity = selectedDate ? getActivity(selectedDate) : null

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Progress Calendar</CardTitle>
          <CardDescription className="mt-1">Tap a day to see everything you logged.</CardDescription>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={goToPreviousMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[9.5rem] text-center font-display text-sm font-semibold text-text-primary">{monthLabel}</span>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {WEEKDAY_HEADERS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const activity = getActivity(day.date)
          const isToday = day.date === today
          const presentIndicators = INDICATORS.filter((indicator) => indicator.present(activity))

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              aria-label={describeActivity(day.date, activity, isToday)}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-sm transition-colors',
                day.inCurrentMonth ? 'text-text-primary hover:bg-surface-elevated' : 'text-text-muted/40 hover:bg-surface-elevated/50',
                isToday && 'bg-accent-soft font-semibold text-accent ring-1 ring-inset ring-accent',
              )}
            >
              <span>{day.dayOfMonth}</span>
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                {presentIndicators.map((indicator) => (
                  <span key={indicator.key} className={cn('size-1.5 rounded-full', indicator.dotClassName)} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <Modal isOpen={selectedDate !== null} onClose={() => setSelectedDate(null)} title={selectedDate ? formatMonthDay(selectedDate) : undefined}>
        {selectedActivity && <DayDetail activity={selectedActivity} waterUnit={waterGoal.preferredUnit} />}
      </Modal>
    </Card>
  )
}

function DayDetail({ activity, waterUnit }: { activity: CalendarDayActivity; waterUnit: 'ml' | 'l' }) {
  if (!activity.hasActivity) {
    return <p className="text-sm text-text-secondary">No progress recorded for this day.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {activity.workout && <DetailRow icon={Footprints} label="Workout" value="Completed" />}
      {activity.weightKg !== null && <DetailRow icon={Scale} label="Weight" value={`${activity.weightKg.toFixed(1)} kg`} />}
      {activity.nutrition && (
        <DetailRow
          icon={Activity}
          label="Nutrition"
          value={
            <>
              <span className="block">{activity.nutrition.calories.toLocaleString()} kcal</span>
              <span className="block">{activity.nutrition.protein} g protein</span>
            </>
          }
        />
      )}
      {activity.waterMl !== null && (
        <DetailRow icon={Droplets} label="Water" value={waterUnit === 'l' ? `${mlToLiters(activity.waterMl)} L` : `${activity.waterMl} ml`} />
      )}
      {activity.habits && <DetailRow icon={ListChecks} label="Habits" value={`${activity.habits.completed} / ${activity.habits.scheduled}`} />}
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Footprints; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-success" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <div className="text-sm font-medium text-text-primary">{value}</div>
      </div>
    </div>
  )
}
