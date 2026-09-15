import { getExerciseById } from '@/data/exercises'
import type { WorkoutSummaryData } from '@/types/dashboard'
import type {
  ProgramDay,
  Workout,
  WorkoutExercise,
  WorkoutHistoryEntry,
  WorkoutProgram,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout'

// ---------------------------------------------------------------------------
// Volume — weight lifted, not body weight. `weight × reps`, summed up.
// ---------------------------------------------------------------------------

export function getSetVolumeKg(set: Pick<WorkoutSet, 'weightKg' | 'reps'>): number {
  return set.weightKg * set.reps
}

/** Sum of completed sets only — sets still in progress don't count toward volume. */
export function getExerciseVolumeKg(exercise: Pick<WorkoutExercise, 'sets'>): number {
  return exercise.sets
    .filter((set) => set.completed)
    .reduce((total, set) => total + getSetVolumeKg(set), 0)
}

export function getSessionVolumeKg(session: Pick<WorkoutSession, 'exercises'>): number {
  return session.exercises.reduce((total, exercise) => total + getExerciseVolumeKg(exercise), 0)
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function getCompletedSetCount(session: Pick<WorkoutSession, 'exercises'>): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  )
}

export function getTotalSetCount(session: Pick<WorkoutSession, 'exercises'>): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

/** An exercise counts as complete once every one of its sets is marked done. */
export function isExerciseComplete(exercise: Pick<WorkoutExercise, 'sets'>): boolean {
  return exercise.sets.length > 0 && exercise.sets.every((set) => set.completed)
}

export function getCompletedExerciseCount(session: Pick<WorkoutSession, 'exercises'>): number {
  return session.exercises.filter(isExerciseComplete).length
}

export function getMuscleGroups(exercises: { muscleGroup: string }[]): string[] {
  return [...new Set(exercises.map((exercise) => exercise.muscleGroup))]
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Elapsed seconds between `startedAt` and either `completedAt` or `now`. Never negative. */
export function getElapsedSeconds(startedAt: string, now: Date = new Date(), completedAt?: string): number {
  const end = completedAt ? new Date(completedAt) : now
  const seconds = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000)
  return Math.max(0, seconds)
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => value.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

// ---------------------------------------------------------------------------
// Calories — a rough estimate only, never a medical or metabolic measurement.
// ---------------------------------------------------------------------------

export function estimateCaloriesBurned(durationMinutes: number, volumeKg: number): number {
  const durationFactor = durationMinutes * 6
  const volumeFactor = volumeKg * 0.01
  return Math.round(durationFactor + volumeFactor)
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export function resolveProgramDay(program: WorkoutProgram, dayIndex: number): ProgramDay {
  const length = program.schedule.length
  const index = ((dayIndex % length) + length) % length
  const day = program.schedule[index]
  if (!day) throw new Error(`Program "${program.id}" has an empty schedule`)
  return day
}

/** Turns a program's workout template into a fresh, unlogged set of session exercises. */
export function instantiateWorkoutExercises(workout: Workout): WorkoutExercise[] {
  return workout.exercises.map((template, exerciseIndex) => {
    const exercise = getExerciseById(template.exerciseId)
    return {
      id: `${workout.id}-ex${exerciseIndex}-${template.exerciseId}`,
      exerciseId: template.exerciseId,
      name: exercise?.name ?? template.exerciseId,
      muscleGroup: exercise?.category ?? 'Other',
      targetReps: template.reps,
      restSeconds: 90,
      sets: Array.from({ length: template.sets }, (_, setIndex) => ({
        id: `${workout.id}-ex${exerciseIndex}-set${setIndex}`,
        setNumber: setIndex + 1,
        weightKg: 0,
        reps: 0,
        completed: false,
      })),
    }
  })
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/** Sets, most recent first, from the most recent session that logged this exercise. */
export function getLastPerformanceForExercise(
  exerciseId: string,
  sessionsMostRecentFirst: WorkoutSession[],
): WorkoutSet[] | null {
  for (const session of sessionsMostRecentFirst) {
    const match = session.exercises.find(
      (exercise) => exercise.exerciseId === exerciseId && exercise.sets.some((set) => set.completed),
    )
    if (match) return match.sets.filter((set) => set.completed)
  }
  return null
}

/**
 * The dashboard's compact "today's workout" summary — driven by the active
 * session when one exists, otherwise by the program's template for today.
 * Returns null on a rest / active-recovery day with no session in progress.
 */
export function getTodaysWorkoutSummary(
  programDay: ProgramDay | null,
  activeSession: WorkoutSession | null,
): WorkoutSummaryData | null {
  if (activeSession) {
    return {
      id: activeSession.id,
      name: activeSession.name,
      muscleGroups: getMuscleGroups(activeSession.exercises),
      totalExercises: activeSession.exercises.length,
      completedExercises: getCompletedExerciseCount(activeSession),
      durationMinutes: Math.round(getElapsedSeconds(activeSession.startedAt) / 60),
    }
  }

  if (programDay?.type === 'workout') {
    const { workout } = programDay
    const muscleGroups = [
      ...new Set(
        workout.exercises
          .map((template) => getExerciseById(template.exerciseId)?.category)
          .filter((category): category is NonNullable<typeof category> => Boolean(category)),
      ),
    ]
    return {
      id: workout.id,
      name: workout.name,
      muscleGroups,
      totalExercises: workout.exercises.length,
      completedExercises: 0,
      durationMinutes: workout.estimatedMinutes,
    }
  }

  return null
}

export function buildHistoryEntry(session: WorkoutSession, personalRecordCount = 0): WorkoutHistoryEntry {
  const durationMinutes = Math.round(
    getElapsedSeconds(session.startedAt, new Date(), session.completedAt) / 60,
  )
  const volumeKg = getSessionVolumeKg(session)

  return {
    id: `history-${session.id}`,
    sessionId: session.id,
    date: session.completedAt ?? session.startedAt,
    name: session.name,
    durationMinutes,
    volumeKg,
    exerciseCount: getCompletedExerciseCount(session),
    setCount: getCompletedSetCount(session),
    personalRecordCount,
    estimatedCalories: estimateCaloriesBurned(durationMinutes, volumeKg),
  }
}
