import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { buttonClassNames } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { WorkoutSummaryData } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

const MotionLink = motion(Link)

export interface TodaysWorkoutCardProps {
  workout: WorkoutSummaryData
  className?: string
}

export function TodaysWorkoutCard({ workout, className }: TodaysWorkoutCardProps) {
  const hasStarted = workout.completedExercises > 0
  const isDone = workout.totalExercises > 0 && workout.completedExercises === workout.totalExercises

  return (
    <Card elevated padding="lg" animate={false} className={cn('flex h-full flex-col justify-between gap-5', className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today's Workout</p>
        <h3 className="mt-1 font-display text-xl font-semibold text-text-primary">{workout.name}</h3>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {workout.muscleGroups.map((group) => (
            <Badge key={group} variant="neutral">
              {group}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex gap-6 text-sm text-text-secondary">
          <span>
            <span className="font-semibold text-text-primary">{workout.totalExercises}</span> exercises
          </span>
          <span className="font-semibold text-text-primary">{formatDuration(workout.durationMinutes)}</span>
        </div>
      </div>

      {hasStarted && (
        <ProgressBar
          value={workout.completedExercises}
          max={workout.totalExercises}
          color={isDone ? 'success' : 'accent'}
          label={`${workout.completedExercises} / ${workout.totalExercises} exercises complete`}
        />
      )}

      <MotionLink
        to="/workout"
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.12 }}
        className={buttonClassNames('primary', 'lg', 'w-full justify-center')}
      >
        {isDone ? 'View Summary' : hasStarted ? 'Continue Workout' : 'Start Workout'}
        <ArrowRight className="size-4" aria-hidden="true" />
      </MotionLink>
    </Card>
  )
}
