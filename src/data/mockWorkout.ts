import type { ExerciseCatalogItem, WorkoutSession } from '@/types/workout'

let setIdCounter = 0
function makeSet(reps: number, weightKg: number, completed = false): WorkoutSession['exercises'][number]['sets'][number] {
  setIdCounter += 1
  return { id: `set-${setIdCounter}`, reps, weightKg, completed }
}

export const mockTodayWorkout: WorkoutSession = {
  id: 'session-today',
  name: 'Push Day — Chest, Shoulders & Triceps',
  programLevel: 'Intermediate',
  week: 6,
  day: 3,
  durationMinutes: 55,
  estimatedCalories: 420,
  completed: false,
  exercises: [
    {
      id: 'ex-bench-press',
      name: 'Barbell Bench Press',
      muscleGroup: 'Chest',
      targetReps: '8-10',
      restSeconds: 120,
      sets: [
        makeSet(10, 60, true),
        makeSet(9, 65, true),
        makeSet(8, 70, false),
        makeSet(8, 70, false),
      ],
    },
    {
      id: 'ex-ohp',
      name: 'Overhead Press',
      muscleGroup: 'Shoulders',
      targetReps: '8-10',
      restSeconds: 90,
      sets: [makeSet(10, 35, true), makeSet(9, 37.5, false), makeSet(8, 37.5, false)],
    },
    {
      id: 'ex-incline-db',
      name: 'Incline Dumbbell Press',
      muscleGroup: 'Chest',
      targetReps: '10-12',
      restSeconds: 90,
      sets: [makeSet(12, 22, false), makeSet(11, 22, false), makeSet(10, 22, false)],
    },
    {
      id: 'ex-lateral-raise',
      name: 'Cable Lateral Raise',
      muscleGroup: 'Shoulders',
      targetReps: '12-15',
      restSeconds: 60,
      sets: [makeSet(15, 7, false), makeSet(14, 7, false), makeSet(14, 7, false)],
    },
    {
      id: 'ex-tricep-pushdown',
      name: 'Triceps Rope Pushdown',
      muscleGroup: 'Triceps',
      targetReps: '12-15',
      restSeconds: 60,
      sets: [makeSet(15, 25, false), makeSet(14, 25, false), makeSet(13, 25, false)],
    },
  ],
}

export const mockExerciseCatalog: ExerciseCatalogItem[] = [
  { id: 'cat-1', name: 'Barbell Back Squat', muscleGroup: 'Legs', equipment: 'Barbell', difficulty: 'Intermediate' },
  { id: 'cat-2', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell', difficulty: 'Advanced' },
  { id: 'cat-3', name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', difficulty: 'Beginner' },
  { id: 'cat-4', name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', difficulty: 'Intermediate' },
  { id: 'cat-5', name: 'Dumbbell Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell', difficulty: 'Beginner' },
  { id: 'cat-6', name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', difficulty: 'Intermediate' },
  { id: 'cat-7', name: 'Bent-Over Row', muscleGroup: 'Back', equipment: 'Barbell', difficulty: 'Intermediate' },
  { id: 'cat-8', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight', difficulty: 'Beginner' },
]

export const mockRestTimerSeconds = 90
