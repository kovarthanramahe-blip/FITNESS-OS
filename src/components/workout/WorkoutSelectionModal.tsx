import { ChevronRight, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Workout } from '@/types/workout'
import { getWorkoutMuscleGroups } from '@/utils/workout'

export interface WorkoutSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  /** The program's own workout days for today (see `getProgramWorkoutOptions`) — never hard-coded. */
  options: Workout[]
  onSelect: (workout: Workout) => void
  onCreateCustom: () => void
}

/**
 * Lets the user pick which of the program's workout days to train today,
 * instead of being locked into whatever `currentDayIndex` scheduled. This
 * never touches the schedule itself — picking one just calls `onSelect`,
 * which starts that workout exactly like the existing "Start" action on a
 * custom workout already does (see `Workout.tsx`'s `handleStartTemplate`).
 */
export function WorkoutSelectionModal({ isOpen, onClose, options, onSelect, onCreateCustom }: WorkoutSelectionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Today's Workout" description="Choose your workout" className="sm:max-w-lg">
      <div className="flex flex-col gap-2">
        {options.map((workout) => {
          const muscleGroups = getWorkoutMuscleGroups(workout)
          return (
            <button
              key={workout.id}
              type="button"
              onClick={() => onSelect(workout)}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-elevated"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-text-primary">{workout.name}</p>
                {muscleGroups.length > 0 && <p className="mt-0.5 truncate text-xs text-text-secondary">{muscleGroups.join(' • ')}</p>}
                <p className="mt-1 text-xs text-text-muted">
                  {workout.exercises.length} exercises · ~{workout.estimatedMinutes} min
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
            </button>
          )
        })}

        <button
          type="button"
          onClick={onCreateCustom}
          className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
        >
          <Plus className="size-4" aria-hidden="true" />
          Custom Workout
        </button>
      </div>
    </Modal>
  )
}
