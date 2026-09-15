import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { WorkoutExercise } from '@/types/workout'
import { cn } from '@/utils/cn'

export interface ExerciseCardProps {
  exercise: WorkoutExercise
  onToggleSet: (exerciseId: string, setId: string) => void
}

export function ExerciseCard({ exercise, onToggleSet }: ExerciseCardProps) {
  const completedCount = exercise.sets.filter((set) => set.completed).length
  const isComplete = completedCount === exercise.sets.length

  return (
    <Card padding="md">
      <CardHeader>
        <div>
          <CardTitle>{exercise.name}</CardTitle>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="neutral">{exercise.muscleGroup}</Badge>
            <span className="text-xs text-text-muted">Target {exercise.targetReps} reps</span>
          </div>
        </div>
        <Badge variant={isComplete ? 'success' : 'neutral'}>
          {completedCount}/{exercise.sets.length} sets
        </Badge>
      </CardHeader>

      <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border">
        <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 bg-surface-elevated px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          <span>Set</span>
          <span>Reps</span>
          <span>Weight</span>
          <span className="text-right">Done</span>
        </div>
        <ul>
          {exercise.sets.map((set, index) => (
            <li
              key={set.id}
              className={cn(
                'grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 px-3 py-2.5 text-sm',
                index !== exercise.sets.length - 1 && 'border-b border-border',
              )}
            >
              <span className="text-text-muted">{index + 1}</span>
              <span className="text-text-primary">{set.reps}</span>
              <span className="text-text-primary">{set.weightKg} kg</span>
              <div className="flex justify-end">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={set.completed}
                  aria-label={`Mark set ${index + 1} as ${set.completed ? 'incomplete' : 'complete'}`}
                  onClick={() => onToggleSet(exercise.id, set.id)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border transition-colors',
                    set.completed
                      ? 'border-accent bg-accent text-text-inverse'
                      : 'border-border text-transparent hover:border-border-strong',
                  )}
                >
                  <motion.span
                    initial={false}
                    animate={{ scale: set.completed ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </motion.span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
