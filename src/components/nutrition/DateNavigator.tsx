import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface DateNavigatorProps {
  date: string
  onChange: (date: string) => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(date: string, days: number): string {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function formatDisplayDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const isToday = date === today()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => onChange(shiftDate(date, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nutrition date"
          type="date"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          max={today()}
          className="h-9 w-auto"
        />
        <span className="hidden text-sm text-text-secondary sm:inline">{formatDisplayDate(date)}</span>
      </div>
      <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => onChange(shiftDate(date, 1))} disabled={isToday}>
        <ChevronRight className="size-4" />
      </Button>
      {!isToday && (
        <Button variant="secondary" size="sm" onClick={() => onChange(today())}>
          Today
        </Button>
      )}
    </div>
  )
}
