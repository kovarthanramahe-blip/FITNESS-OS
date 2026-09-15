import type { PersonalRecord } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession, WorkoutSet } from '@/types/workout'
import { buildHistoryEntry } from '@/utils/workout'

let setCounter = 0
function set(weightKg: number, reps: number): WorkoutSet {
  setCounter += 1
  return { id: `seed-set-${setCounter}`, setNumber: setCounter, weightKg, reps, completed: true }
}

function daysAgoIso(days: number, hour: number, minute = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

/** Completed sessions seeded as history — used for "last time" lookups and PR baselines. */
export const mockCompletedSessions: WorkoutSession[] = [
  {
    id: 'seed-session-push',
    name: 'Push A',
    level: 'Intermediate',
    startedAt: daysAgoIso(2, 18, 0),
    completedAt: daysAgoIso(2, 18, 52),
    exercises: [
      {
        id: 'seed-push-bench',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        muscleGroup: 'Chest',
        targetReps: '6-10',
        restSeconds: 120,
        sets: [set(60, 8), set(60, 8), set(60, 7)],
      },
      {
        id: 'seed-push-ohp',
        exerciseId: 'overhead-press',
        name: 'Overhead Press',
        muscleGroup: 'Shoulders',
        targetReps: '6-10',
        restSeconds: 90,
        sets: [set(35, 8), set(35, 8), set(32.5, 8)],
      },
      {
        id: 'seed-push-incline',
        exerciseId: 'incline-dumbbell-press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        targetReps: '8-12',
        restSeconds: 90,
        sets: [set(20, 10), set(20, 10), set(20, 9)],
      },
      {
        id: 'seed-push-lateral',
        exerciseId: 'lateral-raise',
        name: 'Lateral Raise',
        muscleGroup: 'Shoulders',
        targetReps: '12-15',
        restSeconds: 60,
        sets: [set(7, 12), set(7, 12), set(7, 11)],
      },
      {
        id: 'seed-push-pushdown',
        exerciseId: 'cable-pushdown',
        name: 'Cable Pushdown',
        muscleGroup: 'Triceps',
        targetReps: '10-15',
        restSeconds: 60,
        sets: [set(20, 12), set(20, 12), set(20, 11)],
      },
    ],
  },
  {
    id: 'seed-session-pull',
    name: 'Pull A',
    level: 'Intermediate',
    startedAt: daysAgoIso(4, 18, 0),
    completedAt: daysAgoIso(4, 18, 55),
    exercises: [
      {
        id: 'seed-pull-row',
        exerciseId: 'barbell-row',
        name: 'Barbell Row',
        muscleGroup: 'Back',
        targetReps: '6-10',
        restSeconds: 120,
        sets: [set(60, 8), set(60, 8), set(60, 8)],
      },
      {
        id: 'seed-pull-lat',
        exerciseId: 'lat-pulldown',
        name: 'Lat Pulldown',
        muscleGroup: 'Back',
        targetReps: '8-12',
        restSeconds: 90,
        sets: [set(55, 10), set(55, 10), set(55, 9)],
      },
      {
        id: 'seed-pull-cablerow',
        exerciseId: 'seated-cable-row',
        name: 'Seated Cable Row',
        muscleGroup: 'Back',
        targetReps: '10-12',
        restSeconds: 90,
        sets: [set(50, 10), set(50, 10), set(50, 10)],
      },
      {
        id: 'seed-pull-facepull',
        exerciseId: 'face-pull',
        name: 'Face Pull',
        muscleGroup: 'Shoulders',
        targetReps: '12-15',
        restSeconds: 60,
        sets: [set(15, 15), set(15, 15), set(15, 14)],
      },
      {
        id: 'seed-pull-curl',
        exerciseId: 'barbell-curl',
        name: 'Barbell Curl',
        muscleGroup: 'Biceps',
        targetReps: '8-12',
        restSeconds: 60,
        sets: [set(30, 10), set(30, 10), set(30, 9)],
      },
    ],
  },
  {
    id: 'seed-session-legs',
    name: 'Legs A',
    level: 'Intermediate',
    startedAt: daysAgoIso(6, 18, 0),
    completedAt: daysAgoIso(6, 18, 58),
    exercises: [
      {
        id: 'seed-legs-squat',
        exerciseId: 'squat',
        name: 'Squat',
        muscleGroup: 'Legs',
        targetReps: '5-8',
        restSeconds: 150,
        sets: [set(80, 8), set(80, 8), set(82.5, 6), set(82.5, 6)],
      },
      {
        id: 'seed-legs-press',
        exerciseId: 'leg-press',
        name: 'Leg Press',
        muscleGroup: 'Legs',
        targetReps: '10-12',
        restSeconds: 90,
        sets: [set(120, 10), set(120, 10), set(120, 10)],
      },
      {
        id: 'seed-legs-rdl',
        exerciseId: 'romanian-deadlift',
        name: 'Romanian Deadlift',
        muscleGroup: 'Legs',
        targetReps: '6-10',
        restSeconds: 120,
        sets: [set(70, 8), set(70, 8), set(70, 8)],
      },
      {
        id: 'seed-legs-calf',
        exerciseId: 'calf-raise',
        name: 'Calf Raise',
        muscleGroup: 'Legs',
        targetReps: '12-20',
        restSeconds: 45,
        sets: [set(60, 15), set(60, 15), set(60, 15)],
      },
    ],
  },
]

/** Newest first, matching how the store keeps its history. */
export const mockWorkoutHistory: WorkoutHistoryEntry[] = [...mockCompletedSessions]
  .sort((a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime())
  .map((session) => buildHistoryEntry(session, 0))

/** Baseline PRs, seeded from the sessions above, that a new session can beat. */
export const seedPersonalRecords: PersonalRecord[] = [
  {
    id: 'seed-pr-bench-weight',
    exercise: 'Bench Press',
    exerciseId: 'bench-press',
    weightKg: 60,
    reps: 8,
    date: mockWorkoutHistory[0]?.date ?? new Date().toISOString(),
    type: 'heaviestWeight',
  },
  {
    id: 'seed-pr-bench-1rm',
    exercise: 'Bench Press',
    exerciseId: 'bench-press',
    weightKg: 60,
    reps: 8,
    date: mockWorkoutHistory[0]?.date ?? new Date().toISOString(),
    type: 'estimatedOneRepMax',
    estimatedOneRepMax: 76,
  },
  {
    id: 'seed-pr-squat-weight',
    exercise: 'Squat',
    exerciseId: 'squat',
    weightKg: 82.5,
    reps: 6,
    date: mockWorkoutHistory[2]?.date ?? new Date().toISOString(),
    type: 'heaviestWeight',
  },
  {
    id: 'seed-pr-squat-1rm',
    exercise: 'Squat',
    exerciseId: 'squat',
    weightKg: 82.5,
    reps: 6,
    date: mockWorkoutHistory[2]?.date ?? new Date().toISOString(),
    type: 'estimatedOneRepMax',
    estimatedOneRepMax: 99,
  },
  {
    id: 'seed-pr-row-weight',
    exercise: 'Barbell Row',
    exerciseId: 'barbell-row',
    weightKg: 60,
    reps: 8,
    date: mockWorkoutHistory[1]?.date ?? new Date().toISOString(),
    type: 'heaviestWeight',
  },
  {
    id: 'seed-pr-ohp-weight',
    exercise: 'Overhead Press',
    exerciseId: 'overhead-press',
    weightKg: 35,
    reps: 8,
    date: mockWorkoutHistory[0]?.date ?? new Date().toISOString(),
    type: 'heaviestWeight',
  },
]
