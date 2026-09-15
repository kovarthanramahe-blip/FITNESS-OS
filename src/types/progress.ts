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

// ---------------------------------------------------------------------------
// Weight tracking
// ---------------------------------------------------------------------------

/** Display/entry unit. Weight is always stored internally in kg. */
export type WeightUnit = 'kg' | 'lb'

export interface WeightLog {
  id: string
  /** ISO date string (yyyy-mm-dd). */
  date: string
  weightKg: number
  note?: string
}

export interface WeightGoal {
  startingWeightKg: number
  targetWeightKg: number
  /** ISO date string — when the starting weight was recorded. */
  startDate: string
}

// ---------------------------------------------------------------------------
// Body measurements
// ---------------------------------------------------------------------------

export const DEFAULT_MEASUREMENT_TYPES = [
  'Waist',
  'Chest',
  'Left Arm',
  'Right Arm',
  'Left Thigh',
  'Right Thigh',
  'Hips',
] as const

/** One of the defaults, or a user-defined custom measurement name. */
export type MeasurementType = (typeof DEFAULT_MEASUREMENT_TYPES)[number] | (string & {})

export type MeasurementUnit = 'cm' | 'in'

export interface BodyMeasurement {
  id: string
  type: MeasurementType
  /** ISO date string (yyyy-mm-dd). */
  date: string
  value: number
  unit: MeasurementUnit
  note?: string
}

// ---------------------------------------------------------------------------
// Strength progress (derived from the workout store — never a separate dataset)
// ---------------------------------------------------------------------------

export interface StrengthProgressPoint {
  date: string
  estimatedOneRepMax: number
  weightKg: number
  reps: number
}

export interface StrengthProgress {
  exerciseId: string
  exerciseName: string
  currentBest: { weightKg: number; reps: number; date: string } | null
  previousBest: { weightKg: number; reps: number; date: string } | null
  /** Epley-formula estimate — never a measured maximum. */
  estimatedOneRepMax: number | null
  totalVolumeKg: number
  personalRecordCount: number
  history: StrengthProgressPoint[]
}

// ---------------------------------------------------------------------------
// Shared time-range filter for the Progress page's charts
// ---------------------------------------------------------------------------

export type ProgressTimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL'
