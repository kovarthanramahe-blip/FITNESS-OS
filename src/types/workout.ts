export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Glutes'
  | 'Core'
  | 'Cardio'

export type Equipment = 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight'

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export interface Exercise {
  id: string
  name: string
  category: MuscleGroup
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: Equipment
  difficulty: Difficulty
  instructions: string[]
  defaultSets: number
  /** e.g. "8-10" */
  defaultReps: string
}

// ---------------------------------------------------------------------------
// Programs (data-driven templates — not medical prescriptions)
// ---------------------------------------------------------------------------

export interface WorkoutExerciseTemplate {
  exerciseId: string
  sets: number
  /** e.g. "8-10" */
  reps: string
}

/** A single workout template, e.g. "Push Day" or "Full Body A". */
export interface Workout {
  id: string
  name: string
  exercises: WorkoutExerciseTemplate[]
  estimatedMinutes: number
}

export type ProgramDay =
  | { day: number; label: string; type: 'workout'; workout: Workout }
  | { day: number; label: string; type: 'rest' }
  | { day: number; label: string; type: 'active-recovery' }

export interface WorkoutProgram {
  id: string
  name: string
  level: Difficulty
  daysPerWeek: number
  focus: string
  description: string
  /** Number of weeks the template is designed to run, if applicable. */
  weeks?: number
  /** One full cycle (typically 7 entries for a weekly schedule). */
  schedule: ProgramDay[]
}

// ---------------------------------------------------------------------------
// Active / historical session execution
// ---------------------------------------------------------------------------

export type SetType = 'working' | 'warmup' | 'drop' | 'failure'

export interface WorkoutSet {
  id: string
  setNumber: number
  weightKg: number
  reps: number
  completed: boolean
  restSeconds?: number
  notes?: string
  setType?: SetType
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  name: string
  muscleGroup: string
  targetReps: string
  restSeconds: number
  sets: WorkoutSet[]
}

export interface WorkoutSession {
  id: string
  name: string
  level: Difficulty
  /** ISO timestamp. */
  startedAt: string
  /** ISO timestamp, set once the session is finished. */
  completedAt?: string
  exercises: WorkoutExercise[]
}

export interface WorkoutHistoryEntry {
  id: string
  sessionId: string
  /** ISO date the session took place. */
  date: string
  name: string
  durationMinutes: number
  volumeKg: number
  exerciseCount: number
  setCount: number
  personalRecordCount: number
  estimatedCalories: number
}

export type WorkoutHistory = WorkoutHistoryEntry[]

export type { PersonalRecord } from './progress'
