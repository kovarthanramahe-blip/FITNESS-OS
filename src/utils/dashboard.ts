import type { WorkoutSession } from '@/types/workout'
import type { WorkoutSummaryData } from '@/types/dashboard'

/** Derives the dashboard's compact workout summary from a full workout session. */
export function summarizeWorkout(session: WorkoutSession): WorkoutSummaryData {
  const completedExercises = session.exercises.filter((exercise) =>
    exercise.sets.every((set) => set.completed),
  ).length

  const muscleGroups = [...new Set(session.exercises.map((exercise) => exercise.muscleGroup))]

  return {
    id: session.id,
    name: session.name,
    muscleGroups,
    totalExercises: session.exercises.length,
    completedExercises,
    durationMinutes: session.durationMinutes,
  }
}

export function getScoreLabel(score: number, max = 100): string {
  const percent = (score / max) * 100
  if (percent >= 85) return 'Excellent day'
  if (percent >= 70) return 'Great day'
  if (percent >= 50) return 'Good progress'
  return "Let's build momentum"
}

export function getRemaining(consumed: number, target: number): number {
  return Math.max(target - consumed, 0)
}

export type WeightTrendStatus = 'positive' | 'negative' | 'neutral'

/**
 * Whether a weight change is moving toward the target, away from it, or the
 * person is already at their target. Purely directional — not a health judgement.
 */
export function getWeightTrendStatus(
  changeKg: number,
  currentKg: number,
  targetKg: number,
): WeightTrendStatus {
  const distanceBefore = Math.abs(currentKg - changeKg - targetKg)
  const distanceAfter = Math.abs(currentKg - targetKg)
  if (distanceAfter < distanceBefore) return 'positive'
  if (distanceAfter > distanceBefore) return 'negative'
  return 'neutral'
}
