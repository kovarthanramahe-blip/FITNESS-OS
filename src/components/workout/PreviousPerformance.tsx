import type { WorkoutSet } from '@/types/workout'

export interface PreviousPerformanceProps {
  sets: WorkoutSet[] | null
}

export function PreviousPerformance({ sets }: PreviousPerformanceProps) {
  if (!sets || sets.length === 0) return null

  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-elevated/60 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Last Time</p>
      <p className="mt-1 text-sm text-text-secondary">
        {sets.map((set) => `${set.weightKg} kg × ${set.reps}`).join('   ·   ')}
      </p>
    </div>
  )
}
