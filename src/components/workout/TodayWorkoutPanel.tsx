import { Moon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getExerciseById } from '@/data/exercises'
import type { ProgramDay } from '@/types/workout'

export interface TodayWorkoutPanelProps {
  programDay: ProgramDay
  onStart: () => void
}

export function TodayWorkoutPanel({ programDay, onStart }: TodayWorkoutPanelProps) {
  if (programDay.type !== 'workout') {
    const isRest = programDay.type === 'rest'
    return (
      <Card elevated padding="lg" className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-purple-soft text-purple">
          {isRest ? <Moon className="size-6" /> : <Sparkles className="size-6" />}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {isRest ? 'Rest Day' : 'Active Recovery'}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-text-secondary">
            {isRest
              ? 'Recovery is part of the program — planned rest days aren’t missed days.'
              : 'Light movement today: an easy walk, mobility work, or gentle cardio.'}
          </p>
        </div>
      </Card>
    )
  }

  const { workout } = programDay

  return (
    <Card elevated padding="lg" animate={false} className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today</p>
        <h2 className="mt-1 font-display text-xl font-bold text-text-primary">{workout.name}</h2>
        <div className="mt-2 flex gap-4 text-sm text-text-secondary">
          <span>{workout.exercises.length} exercises</span>
          <span>~{workout.estimatedMinutes} min</span>
        </div>
      </div>

      <ol className="flex flex-col gap-1.5">
        {workout.exercises.map((template, index) => {
          const exercise = getExerciseById(template.exerciseId)
          return (
            <li key={`${template.exerciseId}-${index}`} className="flex items-center gap-2.5 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[11px] font-medium text-text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">{exercise?.name ?? template.exerciseId}</span>
              <span className="shrink-0 text-xs text-text-muted">
                {template.sets} × {template.reps}
              </span>
            </li>
          )
        })}
      </ol>

      <Button variant="primary" size="lg" className="w-full justify-center" onClick={onStart}>
        Start Workout
      </Button>
    </Card>
  )
}
