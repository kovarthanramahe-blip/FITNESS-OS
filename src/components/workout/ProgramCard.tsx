import { Calendar, Target, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { WorkoutProgram } from '@/types/workout'

export interface ProgramCardProps {
  program: WorkoutProgram
  isSelected: boolean
  onSelect: () => void
}

const LEVEL_BADGE = {
  Beginner: 'success',
  Intermediate: 'purple',
  Advanced: 'danger',
} as const

function averageWorkoutMinutes(program: WorkoutProgram): number {
  const workoutDays = program.schedule.filter((day) => day.type === 'workout')
  if (workoutDays.length === 0) return 0
  const total = workoutDays.reduce((sum, day) => sum + (day.type === 'workout' ? day.workout.estimatedMinutes : 0), 0)
  return Math.round(total / workoutDays.length)
}

export function ProgramCard({ program, isSelected, onSelect }: ProgramCardProps) {
  return (
    <Card padding="lg" elevated={isSelected} className="flex h-full flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={LEVEL_BADGE[program.level]}>{program.level}</Badge>
          {isSelected && <Badge variant="accent">Current</Badge>}
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">{program.name}</h3>
        <p className="mt-1 text-sm text-text-secondary">{program.focus}</p>
      </div>

      <div className="flex flex-col gap-2 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <Calendar className="size-4 text-text-muted" aria-hidden="true" />
          {program.daysPerWeek} days / week
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4 text-text-muted" aria-hidden="true" />~{averageWorkoutMinutes(program)} min / session
        </span>
        {program.weeks && (
          <span className="inline-flex items-center gap-2">
            <Target className="size-4 text-text-muted" aria-hidden="true" />
            {program.weeks}-week template
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted">{program.description}</p>

      <Button
        variant={isSelected ? 'secondary' : 'primary'}
        size="md"
        className="mt-auto w-full justify-center"
        onClick={onSelect}
        disabled={isSelected}
      >
        {isSelected ? 'Selected' : 'Start Program'}
      </Button>
    </Card>
  )
}
