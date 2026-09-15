import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import type { WorkoutSession } from '@/types/workout'
import { cn } from '@/utils/cn'
import {
  formatElapsed,
  getCompletedExerciseCount,
  getCompletedSetCount,
  getTotalSetCount,
  isExerciseComplete,
} from '@/utils/workout'

export interface SessionHeaderProps {
  session: WorkoutSession
  currentExerciseIndex: number
  onSelectExercise: (index: number) => void
  onDiscard: () => void
}

export function SessionHeader({ session, currentExerciseIndex, onSelectExercise, onDiscard }: SessionHeaderProps) {
  const elapsedSeconds = useElapsedSeconds(session.startedAt)
  const completedExercises = getCompletedExerciseCount(session)
  const totalExercises = session.exercises.length
  const completedSets = getCompletedSetCount(session)
  const totalSets = getTotalSetCount(session)
  const isDone = totalSets > 0 && completedSets === totalSets

  return (
    <Card elevated padding="lg" animate={false} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Active Workout</p>
          <h1 className="truncate font-display text-xl font-bold text-text-primary">{session.name}</h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-bold tabular-nums text-text-primary">{formatElapsed(elapsedSeconds)}</p>
          <p className="text-[11px] text-text-muted">elapsed</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>
          {completedExercises} / {totalExercises} exercises
        </span>
        <span>
          {completedSets} / {totalSets} sets
        </span>
      </div>

      <ProgressBar value={completedSets} max={totalSets || 1} color={isDone ? 'success' : 'accent'} />

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {session.exercises.map((exercise, index) => {
          const done = isExerciseComplete(exercise)
          const isCurrent = index === currentExerciseIndex
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => onSelectExercise(index)}
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={`${exercise.name}, ${done ? 'complete' : 'not complete'}`}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                isCurrent
                  ? 'border-accent bg-accent-soft text-accent'
                  : done
                    ? 'border-success/40 text-success'
                    : 'border-border text-text-secondary hover:border-border-strong',
              )}
            >
              {done && <Check className="size-3" aria-hidden="true" />}
              {exercise.name}
            </button>
          )
        })}
      </div>

      <Button variant="ghost" size="sm" onClick={onDiscard} className="self-start text-text-muted">
        Discard workout
      </Button>
    </Card>
  )
}
