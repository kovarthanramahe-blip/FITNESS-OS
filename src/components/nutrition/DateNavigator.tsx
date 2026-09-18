import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { addDaysToDateString, getTodayDateString, parseDateOnly } from '@/utils/dateRange'

export interface DateNavigatorProps {
  date: string
  onChange: (date: string) => void
  ariaLabel?: string
}

function formatDisplayDate(date: string): string {
  return parseDateOnly(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Browsing is unbounded in both directions — including into the future,
 * where there's simply nothing logged yet (the day's sections render their
 * normal empty states). There's no product reason to stop someone looking
 * ahead, only to stop them logging food for a day that hasn't happened,
 * which FoodEntryModal's own date field still enforces separately.
 */
export function DateNavigator({ date, onChange, ariaLabel = 'Nutrition date' }: DateNavigatorProps) {
  const isToday = date === getTodayDateString()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => onChange(addDaysToDateString(date, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-2">
        <Input
          aria-label={ariaLabel}
          type="date"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-auto"
        />
        <span className="hidden text-sm text-text-secondary sm:inline">{formatDisplayDate(date)}</span>
      </div>
      <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => onChange(addDaysToDateString(date, 1))}>
        <ChevronRight className="size-4" />
      </Button>
      {!isToday && (
        <Button variant="secondary" size="sm" onClick={() => onChange(getTodayDateString())}>
          Today
        </Button>
      )}
    </div>
  )
}
