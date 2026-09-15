import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { WorkoutHistoryEntry } from '@/types/workout'
import { formatNumber } from '@/utils/format'
import { WorkoutSummaryModal } from './WorkoutSummaryModal'

export interface WorkoutHistoryListProps {
  history: WorkoutHistoryEntry[]
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function WorkoutHistoryList({ history }: WorkoutHistoryListProps) {
  const [selected, setSelected] = useState<WorkoutHistoryEntry | null>(null)

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Workout History</CardTitle>
      </CardHeader>

      {history.length === 0 ? (
        <EmptyState title="No workouts logged yet" description="Complete a session to see it show up here." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {history.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setSelected(entry)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-surface-elevated/60 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{formatRelativeDate(entry.date)}</p>
                  <p className="truncate text-xs text-text-muted">{entry.name}</p>
                </div>
                <div className="flex shrink-0 gap-4 text-right text-sm text-text-secondary">
                  <span>{entry.durationMinutes} min</span>
                  <span className="hidden sm:inline">{formatNumber(Math.round(entry.volumeKg))} kg</span>
                  <span className="hidden sm:inline">{entry.exerciseCount} exercises</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <WorkoutSummaryModal
          isOpen
          onClose={() => setSelected(null)}
          entry={selected}
          title="Workout Summary"
        />
      )}
    </Card>
  )
}
