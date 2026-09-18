import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ACTIVITY_TYPE_LABELS } from '@/data/activityCatalogue'
import type { ActivityEntry } from '@/types/activity'
import { parseDateOnly } from '@/utils/dateRange'

export interface ActivityHistoryListProps {
  entries: ActivityEntry[]
  onDelete: (id: string) => void
}

function formatDate(date: string): string {
  return parseDateOnly(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ActivityHistoryList({ entries, onDelete }: ActivityHistoryListProps) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">No activities logged yet — add one to get started.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{ACTIVITY_TYPE_LABELS[entry.activityType]}</p>
                <p className="text-xs text-text-muted">
                  {formatDate(entry.date)} · {entry.durationMinutes} min · {entry.estimatedCalories} kcal (est.)
                </p>
                {entry.notes && <p className="mt-0.5 truncate text-xs text-text-secondary">{entry.notes}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${ACTIVITY_TYPE_LABELS[entry.activityType]} on ${formatDate(entry.date)}`}
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
