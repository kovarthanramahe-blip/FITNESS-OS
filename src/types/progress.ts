export interface WeightEntry {
  date: string
  weightKg: number
}

export interface PersonalRecord {
  id: string
  exercise: string
  weightKg: number
  reps: number
  date: string
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
