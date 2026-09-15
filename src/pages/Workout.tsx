import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Flame, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ExerciseCard } from '@/components/workout/ExerciseCard'
import { RestTimer } from '@/components/workout/RestTimer'
import { mockRestTimerSeconds, mockTodayWorkout } from '@/data/mockWorkout'
import type { WorkoutSession } from '@/types/workout'

export function Workout() {
  const [session, setSession] = useState<WorkoutSession>(mockTodayWorkout)

  const { totalSets, completedSets } = useMemo(() => {
    const allSets = session.exercises.flatMap((exercise) => exercise.sets)
    return {
      totalSets: allSets.length,
      completedSets: allSets.filter((set) => set.completed).length,
    }
  }, [session])

  const isWorkoutComplete = totalSets > 0 && completedSets === totalSets

  function toggleSet(exerciseId: string, setId: string) {
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id !== setId ? set : { ...set, completed: !set.completed },
              ),
            },
      ),
    }))
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <Card elevated padding="lg">
          <CardHeader>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="purple">{session.programLevel}</Badge>
                <span className="text-xs text-text-muted">
                  Week {session.week} · Day {session.day}
                </span>
              </div>
              <CardTitle className="mt-2">{session.name}</CardTitle>
            </div>
          </CardHeader>

          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-text-muted" />
              {session.durationMinutes} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="size-4 text-text-muted" />
              {session.estimatedCalories} kcal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-4 text-text-muted" />
              {session.exercises.length} exercises
            </span>
          </div>

          <div className="mt-5">
            <ProgressBar
              value={completedSets}
              max={totalSets}
              color={isWorkoutComplete ? 'success' : 'accent'}
              label="Sets completed"
              showValue
            />
          </div>
        </Card>
      </motion.div>

      {isWorkoutComplete ? (
        <motion.div variants={staggerItem}>
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary">Workout Complete!</h2>
              <p className="mt-1 text-sm text-text-secondary">Great work — you earned 85 XP for finishing this session.</p>
            </div>
            <Button variant="secondary" size="sm">
              View Summary
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={staggerItem}>
          <RestTimer defaultSeconds={mockRestTimerSeconds} />
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        {session.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onToggleSet={toggleSet} />
        ))}
      </motion.div>

      {!isWorkoutComplete && (
        <motion.div variants={staggerItem} className="flex justify-end">
          <Button variant="primary" size="lg">
            Finish Workout
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
