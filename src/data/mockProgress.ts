import type { PersonalRecord, StrengthProgressPoint, WeightEntry, WorkoutStat } from '@/types/progress'

export const mockWeightHistory: WeightEntry[] = [
  { date: 'Wk 1', weightKg: 82.1 },
  { date: 'Wk 2', weightKg: 81.6 },
  { date: 'Wk 3', weightKg: 81.2 },
  { date: 'Wk 4', weightKg: 80.5 },
  { date: 'Wk 5', weightKg: 80.1 },
  { date: 'Wk 6', weightKg: 79.4 },
  { date: 'Wk 7', weightKg: 79.0 },
  { date: 'Wk 8', weightKg: 78.4 },
]

export const mockStrengthProgress: StrengthProgressPoint[] = [
  { month: 'Apr', benchKg: 55, squatKg: 80, deadliftKg: 100 },
  { month: 'May', benchKg: 60, squatKg: 87.5, deadliftKg: 110 },
  { month: 'Jun', benchKg: 62.5, squatKg: 95, deadliftKg: 120 },
  { month: 'Jul', benchKg: 67.5, squatKg: 100, deadliftKg: 130 },
  { month: 'Aug', benchKg: 70, squatKg: 107.5, deadliftKg: 140 },
  { month: 'Sep', benchKg: 72.5, squatKg: 112.5, deadliftKg: 147.5 },
]

export const mockPersonalRecords: PersonalRecord[] = [
  { id: 'pr-1', exercise: 'Bench Press', weightKg: 72.5, reps: 3, date: 'Sep 8' },
  { id: 'pr-2', exercise: 'Back Squat', weightKg: 112.5, reps: 2, date: 'Sep 5' },
  { id: 'pr-3', exercise: 'Deadlift', weightKg: 147.5, reps: 1, date: 'Sep 1' },
  { id: 'pr-4', exercise: 'Overhead Press', weightKg: 42.5, reps: 4, date: 'Aug 28' },
]

export const mockWorkoutStats: WorkoutStat[] = [
  { label: 'Workouts this month', value: '18', hint: '+4 vs last month' },
  { label: 'Total volume lifted', value: '46.2 t' },
  { label: 'Avg. session length', value: '54 min' },
  { label: 'Consistency', value: '91%' },
]
