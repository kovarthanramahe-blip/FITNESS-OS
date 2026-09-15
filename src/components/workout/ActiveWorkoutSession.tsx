import { motion } from 'framer-motion'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { addSet, completeSession, discardSession, getCompletedSessionsMostRecentFirst, updateSet } from '@/lib/workoutStore'
import type { WorkoutSession, WorkoutSet } from '@/types/workout'
import { getLastPerformanceForExercise } from '@/utils/workout'
import { ActiveExercisePanel } from './ActiveExercisePanel'
import { PRCelebrationBanner } from './PRCelebrationBanner'
import { RestTimer } from './RestTimer'
import { SessionHeader } from './SessionHeader'

export interface ActiveWorkoutSessionProps {
  session: WorkoutSession
}

/**
 * The live workout-execution screen. Rendered with `key={session.id}` by the
 * parent so a brand-new session always starts with fresh local UI state
 * (current exercise, rest timer) without needing a reset effect.
 *
 * The completion summary modal is intentionally NOT rendered here: finishing
 * the workout clears `activeSession` (unmounting this component) in the same
 * update that populates the summary, so the modal is owned by the parent,
 * which stays mounted either way.
 */
export function ActiveWorkoutSession({ session }: ActiveWorkoutSessionProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [restSignal, setRestSignal] = useState(0)

  const currentExercise = session.exercises[currentExerciseIndex] ?? session.exercises[0]
  const isLastExercise = currentExerciseIndex === session.exercises.length - 1

  const previousPerformance = currentExercise
    ? getLastPerformanceForExercise(currentExercise.exerciseId, getCompletedSessionsMostRecentFirst())
    : null

  function handleUpdateSet(setId: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed'>>) {
    if (!currentExercise) return
    updateSet(currentExercise.id, setId, patch)
    if (patch.completed) setRestSignal((signal) => signal + 1)
  }

  function handleAddSet() {
    if (!currentExercise) return
    addSet(currentExercise.id)
  }

  function handleNextExercise() {
    setCurrentExerciseIndex((index) => Math.min(index + 1, session.exercises.length - 1))
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-4">
      <PRCelebrationBanner />

      <motion.div variants={staggerItem}>
        <SessionHeader
          session={session}
          currentExerciseIndex={currentExerciseIndex}
          onSelectExercise={setCurrentExerciseIndex}
          onDiscard={() => {
            if (window.confirm('Discard this workout? Your logged sets will not be saved.')) {
              discardSession()
            }
          }}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <RestTimer restartSignal={restSignal} defaultSeconds={currentExercise?.restSeconds ?? 90} />
      </motion.div>

      {currentExercise && (
        <motion.div variants={staggerItem}>
          <ActiveExercisePanel
            exercise={currentExercise}
            previousPerformance={previousPerformance}
            isLastExercise={isLastExercise}
            onUpdateSet={handleUpdateSet}
            onAddSet={handleAddSet}
            onNext={handleNextExercise}
          />
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={() => completeSession()}>
          Finish Workout
        </Button>
      </motion.div>
    </motion.div>
  )
}
