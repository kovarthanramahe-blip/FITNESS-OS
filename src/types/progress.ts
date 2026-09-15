export interface WeightEntry {
  date: string
  weightKg: number
}

export type PersonalRecordType = 'heaviestWeight' | 'mostRepsAtWeight' | 'estimatedOneRepMax'

export interface PersonalRecord {
  id: string
  exercise: string
  weightKg: number
  reps: number
  date: string
  /** Links back to the exercise library entry, when known. */
  exerciseId?: string
  /** What kind of record this is; omitted for older/simple entries. */
  type?: PersonalRecordType
  /**
   * Epley-formula estimate, only meaningful when `type` is
   * 'estimatedOneRepMax' — an estimate, never a measured maximum.
   */
  estimatedOneRepMax?: number
}

export interface WorkoutStat {
  label: string
  value: string
  hint?: string
}

export interface StrengthProgressPoint {
  month: string
  benchKg: number
  squatKg: number
  deadliftKg: number
}
