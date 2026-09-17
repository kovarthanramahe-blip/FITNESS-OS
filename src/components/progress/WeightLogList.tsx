import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import type { WeightLog } from '@/types/progress'
import { fadeIn } from '@/animations/variants'
import { parseDateOnly } from '@/utils/dateRange'

export interface WeightLogListProps {
  logs: WeightLog[]
  onEdit: (log: WeightLog) => void
  onDelete: (log: WeightLog) => void
}

function formatDate(dateIso: string): string {
  return parseDateOnly(dateIso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function WeightLogList({ logs, onEdit, onDelete }: WeightLogListProps) {
  if (logs.length === 0) {
    return <EmptyState title="No weight entries yet" description="Add your first weigh-in to start tracking your trend." />
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ul className="flex flex-col divide-y divide-border">
      <AnimatePresence initial={false}>
        {sorted.map((log) => (
          <motion.li
            key={log.id}
            layout
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{log.weightKg.toFixed(1)} kg</p>
              <p className="truncate text-xs text-text-muted">
                {formatDate(log.date)}
                {log.note ? ` · ${log.note}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={`Edit weight entry from ${formatDate(log.date)}`} onClick={() => onEdit(log)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete weight entry from ${formatDate(log.date)}`}
                onClick={() => onDelete(log)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
