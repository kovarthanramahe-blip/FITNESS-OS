import { motion, useReducedMotion } from 'framer-motion'
import { Droplets, Plus } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { WaterSummary } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { clamp } from '@/utils/format'

export interface WaterCardProps {
  data: WaterSummary
  className?: string
}

const QUICK_ADD_ML = [250, 500]

export function WaterCard({ data, className }: WaterCardProps) {
  const [consumedMl, setConsumedMl] = useState(data.consumedMl)
  const prefersReducedMotion = useReducedMotion()
  const percent = clamp((consumedMl / data.targetMl) * 100, 0, 100)

  function addWater(amountMl: number) {
    setConsumedMl((current) => clamp(current + amountMl, 0, data.targetMl * 2))
  }

  return (
    <Card padding="md" className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Water</p>
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary-soft text-secondary">
          <Droplets className="size-4" strokeWidth={2.25} />
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="relative h-14 w-9 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-elevated"
          role="img"
          aria-label={`Water level ${Math.round(percent)}%`}
        >
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-secondary"
            initial={false}
            animate={{ height: `${percent}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold text-text-primary">
            <span>{(consumedMl / 1000).toFixed(1)}</span>
            <span className="text-sm font-normal text-text-muted">L / {(data.targetMl / 1000).toFixed(1)}L</span>
          </p>
          <p className="text-xs text-text-muted">{Math.round(percent)}% of daily goal</p>
        </div>
      </div>

      <div className="flex gap-2">
        {QUICK_ADD_ML.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => addWater(amount)}
            aria-label={`Add ${amount} milliliters of water`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-elevated px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-secondary/50 hover:text-secondary"
          >
            <Plus className="size-3" aria-hidden="true" />+{amount} ml
          </button>
        ))}
      </div>
    </Card>
  )
}
