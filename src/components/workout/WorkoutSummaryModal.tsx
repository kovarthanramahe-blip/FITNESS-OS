import { CheckCircle2, Clock, Dumbbell, Flame, ListChecks, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { PersonalRecord } from '@/types/progress'
import type { WorkoutHistoryEntry } from '@/types/workout'
import { formatNumber } from '@/utils/format'

export interface WorkoutSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  entry: WorkoutHistoryEntry
  newPersonalRecords?: PersonalRecord[]
  title?: string
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">{value}</p>
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  )
}

export function WorkoutSummaryModal({
  isOpen,
  onClose,
  entry,
  newPersonalRecords = [],
  title = 'Workout Complete',
}: WorkoutSummaryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-sm">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary">{entry.name}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <StatTile icon={Clock} label="Duration" value={`${entry.durationMinutes} min`} />
        <StatTile icon={ListChecks} label="Exercises completed" value={String(entry.exerciseCount)} />
        <StatTile icon={Dumbbell} label="Sets completed" value={String(entry.setCount)} />
        <StatTile icon={Flame} label="Calories (estimate)" value={`~${formatNumber(entry.estimatedCalories)} kcal`} />
      </div>

      <div className="mt-2.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5">
        <p className="text-xs text-text-muted">Total Volume</p>
        <p className="font-display text-xl font-bold text-text-primary">{formatNumber(Math.round(entry.volumeKg))} kg</p>
      </div>

      {newPersonalRecords.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft px-3 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Trophy className="size-3.5" />
            {newPersonalRecords.length} personal record{newPersonalRecords.length > 1 ? 's' : ''}
          </p>
          <ul className="flex flex-col gap-1">
            {newPersonalRecords.map((record) => (
              <li key={record.id} className="flex items-center justify-between text-sm text-text-primary">
                <span>{record.exercise}</span>
                <Badge variant="accent">
                  {record.weightKg} kg × {record.reps}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="primary" size="lg" className="mt-5 w-full justify-center" onClick={onClose}>
        Done
      </Button>
    </Modal>
  )
}
