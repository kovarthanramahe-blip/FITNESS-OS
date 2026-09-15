export type ProgramLevel = 'Beginner' | 'Intermediate' | 'Advanced'

export interface ExerciseSet {
  id: string
  reps: number
  weightKg: number
  completed: boolean
  isWarmup?: boolean
}

export interface WorkoutExercise {
  id: string
  name: string
  muscleGroup: string
  targetReps: string
  restSeconds: number
  sets: ExerciseSet[]
}

export interface WorkoutSession {
  id: string
  name: string
  programLevel: ProgramLevel
  week: number
  day: number
  durationMinutes: number
  estimatedCalories: number
  completed: boolean
  exercises: WorkoutExercise[]
}

export interface ExerciseCatalogItem {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  difficulty: ProgramLevel
}
