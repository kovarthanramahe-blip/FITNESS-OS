import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Exercise } from '@/types/workout'

export interface ExerciseLibraryCardProps {
  exercise: Exercise
  onView: () => void
}

export function ExerciseLibraryCard({ exercise, onView }: ExerciseLibraryCardProps) {
  return (
    <Card padding="md" className="flex h-full flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold text-text-primary">{exercise.name}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{exercise.primaryMuscle}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="neutral">{exercise.category}</Badge>
        <Badge variant="neutral">{exercise.equipment}</Badge>
        <Badge variant="purple">{exercise.difficulty}</Badge>
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        <p className="text-xs text-text-secondary">
          {exercise.defaultSets} × {exercise.defaultReps}
        </p>
        <Button variant="secondary" size="sm" onClick={onView}>
          View
        </Button>
      </div>
    </Card>
  )
}
