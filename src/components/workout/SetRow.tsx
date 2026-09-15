import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useId } from 'react'
import type { WorkoutSet } from '@/types/workout'
import { cn } from '@/utils/cn'

export interface SetRowProps {
  set: WorkoutSet
  onChange: (patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed'>>) => void
}

export function SetRow({ set, onChange }: SetRowProps) {
  const weightId = useId()
  const repsId = useId()

  return (
    <div
      className={cn(
        'grid grid-cols-[2.5rem_1fr_1fr_3rem] items-center gap-2 rounded-[var(--radius-sm)] px-1 py-1.5 sm:gap-3',
        set.completed && 'bg-accent-soft',
      )}
    >
      <span className="text-center text-sm font-medium text-text-muted">{set.setNumber}</span>

      <div className="relative">
        <label htmlFor={weightId} className="sr-only">
          Weight for set {set.setNumber} in kilograms
        </label>
        <input
          id={weightId}
          type="number"
          inputMode="decimal"
          step={0.5}
          min={0}
          value={set.weightKg || ''}
          placeholder="0"
          onChange={(event) => onChange({ weightKg: Number(event.target.value) || 0 })}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-center text-base font-semibold text-text-primary [appearance:textfield] focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
          kg
        </span>
      </div>

      <div>
        <label htmlFor={repsId} className="sr-only">
          Reps for set {set.setNumber}
        </label>
        <input
          id={repsId}
          type="number"
          inputMode="numeric"
          min={0}
          value={set.reps || ''}
          placeholder="0"
          onChange={(event) => onChange({ reps: Number(event.target.value) || 0 })}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-center text-base font-semibold text-text-primary [appearance:textfield] focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={set.completed}
        aria-label={`Mark set ${set.setNumber} as ${set.completed ? 'not done' : 'done'}`}
        onClick={() => onChange({ completed: !set.completed })}
        className={cn(
          'flex h-11 w-11 items-center justify-center justify-self-center rounded-full border-2 transition-colors',
          set.completed
            ? 'border-accent bg-accent text-text-inverse'
            : 'border-border text-transparent hover:border-border-strong',
        )}
      >
        <motion.span initial={false} animate={{ scale: set.completed ? 1 : 0 }} transition={{ duration: 0.15 }}>
          <Check className="size-5" strokeWidth={3} />
        </motion.span>
      </button>
    </div>
  )
}
