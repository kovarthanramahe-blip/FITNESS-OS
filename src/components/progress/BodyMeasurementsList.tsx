import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import type { BodyMeasurement } from '@/types/progress'
import { fadeIn } from '@/animations/variants'

export interface BodyMeasurementsListProps {
  measurements: BodyMeasurement[]
  onEdit: (measurement: BodyMeasurement) => void
  onDelete: (measurement: BodyMeasurement) => void
}

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function BodyMeasurementsList({ measurements, onEdit, onDelete }: BodyMeasurementsListProps) {
  if (measurements.length === 0) {
    return <EmptyState title="No measurements logged" description="Add your first measurement to start tracking this trend." />
  }

  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ul className="flex flex-col divide-y divide-border">
      <AnimatePresence initial={false}>
        {sorted.map((measurement) => (
          <motion.li
            key={measurement.id}
            layout
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {measurement.type} · {measurement.value} {measurement.unit}
              </p>
              <p className="truncate text-xs text-text-muted">
                {formatDate(measurement.date)}
                {measurement.note ? ` · ${measurement.note}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${measurement.type} measurement from ${formatDate(measurement.date)}`}
                onClick={() => onEdit(measurement)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${measurement.type} measurement from ${formatDate(measurement.date)}`}
                onClick={() => onDelete(measurement)}
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
