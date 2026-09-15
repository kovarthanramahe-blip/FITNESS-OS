import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { getCompletedSessionsMostRecentFirst } from '@/lib/workoutStore'
import type { Exercise } from '@/types/workout'
import { getLastPerformanceForExercise } from '@/utils/workout'

export interface ExerciseDetailModalProps {
  exercise: Exercise | null
  onClose: () => void
}

export function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const lastPerformance = exercise
    ? getLastPerformanceForExercise(exercise.id, getCompletedSessionsMostRecentFirst())
    : null

  return (
    <Modal isOpen={exercise !== null} onClose={onClose} title={exercise?.name} className="sm:max-w-md">
      {exercise && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="neutral">{exercise.category}</Badge>
            <Badge variant="neutral">{exercise.equipment}</Badge>
            <Badge variant="purple">{exercise.difficulty}</Badge>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-text-muted">Primary muscle</p>
              <p className="text-text-primary">{exercise.primaryMuscle}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Default</p>
              <p className="text-text-primary">
                {exercise.defaultSets} × {exercise.defaultReps}
              </p>
            </div>
          </div>

          {exercise.secondaryMuscles.length > 0 && (
            <p className="text-xs text-text-muted">Also works: {exercise.secondaryMuscles.join(', ')}</p>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">How to</p>
            <ol className="flex flex-col gap-1.5 text-sm text-text-secondary">
              {exercise.instructions.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="shrink-0 font-medium text-text-muted">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {lastPerformance && lastPerformance.length > 0 && (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-elevated/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Recent Performance</p>
              <p className="mt-1 text-sm text-text-secondary">
                {lastPerformance.map((set) => `${set.weightKg} kg × ${set.reps}`).join('   ·   ')}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
