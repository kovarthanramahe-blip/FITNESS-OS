import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { WorkoutExercise, WorkoutSet } from '@/types/workout'
import { PreviousPerformance } from './PreviousPerformance'
import { SetRow } from './SetRow'

export interface ActiveExercisePanelProps {
  exercise: WorkoutExercise
  previousPerformance: WorkoutSet[] | null
  isLastExercise: boolean
  onUpdateSet: (setId: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed'>>) => void
  onAddSet: () => void
  onNext: () => void
}

export function ActiveExercisePanel({
  exercise,
  previousPerformance,
  isLastExercise,
  onUpdateSet,
  onAddSet,
  onNext,
}: ActiveExercisePanelProps) {
  const completedCount = exercise.sets.filter((set) => set.completed).length

  return (
    <Card padding="md" animate={false} className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-text-primary">{exercise.name}</h2>
          <Badge variant={completedCount === exercise.sets.length ? 'success' : 'neutral'}>
            {completedCount}/{exercise.sets.length} sets
          </Badge>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Target {exercise.targetReps} reps · {exercise.muscleGroup}
        </p>
      </div>

      <PreviousPerformance sets={previousPerformance} />

      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_3rem] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-text-muted sm:gap-3">
          <span className="text-center">Set</span>
          <span className="text-center">kg</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Done</span>
        </div>
        {exercise.sets.map((set) => (
          <SetRow key={set.id} set={set} onChange={(patch) => onUpdateSet(set.id, patch)} />
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="md" className="flex-1" onClick={onAddSet} leftIcon={<Plus className="size-4" />}>
          Add Set
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={onNext}>
          {isLastExercise ? 'Finish Exercise' : 'Complete Exercise'}
        </Button>
      </div>
    </Card>
  )
}
