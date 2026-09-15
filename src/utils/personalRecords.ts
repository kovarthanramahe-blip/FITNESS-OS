import type { PersonalRecord, PersonalRecordType } from '@/types/progress'
import type { WorkoutSet } from '@/types/workout'

/**
 * Estimated one-rep max using the Epley formula. This is a well-known
 * estimate derived from a submaximal set — never a measured maximum.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

export interface DetectedPersonalRecord {
  type: PersonalRecordType
  weightKg: number
  reps: number
  estimatedOneRepMax?: number
  /** The record this beats, if one existed. */
  previousBestKg?: number
}

const PRIORITY: PersonalRecordType[] = ['heaviestWeight', 'estimatedOneRepMax', 'mostRepsAtWeight']

/**
 * Compares one completed set against an exercise's prior records and returns
 * every record type it beats (an empty array means no PR). Zero/blank sets
 * never count.
 */
export function detectPersonalRecords(
  exerciseId: string,
  set: Pick<WorkoutSet, 'weightKg' | 'reps'>,
  previousRecords: PersonalRecord[],
): DetectedPersonalRecord[] {
  if (set.weightKg <= 0 || set.reps <= 0) return []

  const relevant = previousRecords.filter((record) => record.exerciseId === exerciseId)
  const results: DetectedPersonalRecord[] = []

  const bestWeight = Math.max(0, ...relevant.map((record) => record.weightKg))
  if (set.weightKg > bestWeight) {
    results.push({
      type: 'heaviestWeight',
      weightKg: set.weightKg,
      reps: set.reps,
      previousBestKg: bestWeight || undefined,
    })
  }

  const bestEstimate = Math.max(
    0,
    ...relevant.filter((record) => record.estimatedOneRepMax).map((record) => record.estimatedOneRepMax ?? 0),
  )
  const estimate = estimateOneRepMax(set.weightKg, set.reps)
  if (estimate > bestEstimate) {
    results.push({
      type: 'estimatedOneRepMax',
      weightKg: set.weightKg,
      reps: set.reps,
      estimatedOneRepMax: estimate,
      previousBestKg: bestEstimate || undefined,
    })
  }

  // Only meaningful once there's a prior attempt at this exact weight to beat —
  // otherwise every brand-new weight would trivially "PR" against a baseline of zero.
  const priorAtThisWeight = relevant.filter((record) => record.weightKg === set.weightKg)
  if (priorAtThisWeight.length > 0) {
    const bestRepsAtThisWeight = Math.max(...priorAtThisWeight.map((record) => record.reps))
    if (set.reps > bestRepsAtThisWeight) {
      results.push({
        type: 'mostRepsAtWeight',
        weightKg: set.weightKg,
        reps: set.reps,
        previousBestKg: bestRepsAtThisWeight,
      })
    }
  }

  return results
}

/** Picks the single most impressive PR to headline a celebration. */
export function pickHeadlinePersonalRecord(
  detected: DetectedPersonalRecord[],
): DetectedPersonalRecord | null {
  if (detected.length === 0) return null
  return [...detected].sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type))[0] ?? null
}
