import type { ProgramDay, WorkoutExerciseTemplate, WorkoutProgram } from '@/types/workout'

function ex(exerciseId: string, sets: number, reps: string): WorkoutExerciseTemplate {
  return { exerciseId, sets, reps }
}

function restDay(day: number): ProgramDay {
  return { day, label: 'Rest', type: 'rest' }
}

function activeRecoveryDay(day: number): ProgramDay {
  return { day, label: 'Active Recovery', type: 'active-recovery' }
}

function workoutDay(day: number, label: string, workoutId: string, exercises: WorkoutExerciseTemplate[], estimatedMinutes: number): ProgramDay {
  return {
    day,
    label,
    type: 'workout',
    workout: { id: workoutId, name: label, exercises, estimatedMinutes },
  }
}

/**
 * Starter workout program templates. These are general fitness templates,
 * not medically prescribed routines — always train within your own limits.
 */
export const workoutPrograms: WorkoutProgram[] = [
  {
    id: 'beginner-full-body',
    name: 'Beginner Full Body',
    level: 'Beginner',
    daysPerWeek: 3,
    focus: 'Full body strength foundations',
    description: 'A simple three-day full-body split to build consistent training habits and base strength.',
    weeks: 8,
    schedule: [
      workoutDay(1, 'Full Body A', 'beginner-full-body-a', [
        ex('squat', 3, '8-10'),
        ex('bench-press', 3, '8-10'),
        ex('lat-pulldown', 3, '10-12'),
        ex('dumbbell-shoulder-press', 3, '10-12'),
        ex('plank', 3, '30-45s'),
      ], 40),
      restDay(2),
      workoutDay(3, 'Full Body B', 'beginner-full-body-b', [
        ex('leg-press', 3, '10-12'),
        ex('incline-dumbbell-press', 3, '10-12'),
        ex('seated-cable-row', 3, '10-12'),
        ex('lateral-raise', 3, '12-15'),
        ex('cable-crunch', 3, '12-15'),
      ], 40),
      restDay(4),
      workoutDay(5, 'Full Body A', 'beginner-full-body-a', [
        ex('squat', 3, '8-10'),
        ex('bench-press', 3, '8-10'),
        ex('lat-pulldown', 3, '10-12'),
        ex('dumbbell-shoulder-press', 3, '10-12'),
        ex('plank', 3, '30-45s'),
      ], 40),
      activeRecoveryDay(6),
      restDay(7),
    ],
  },
  {
    id: 'beginner-upper-lower',
    name: 'Beginner Upper/Lower',
    level: 'Beginner',
    daysPerWeek: 4,
    focus: 'Upper/lower split for steady progression',
    description: 'A four-day upper/lower split that balances recovery with more frequent practice per muscle group.',
    weeks: 8,
    schedule: [
      workoutDay(1, 'Upper A', 'beginner-upper-a', [
        ex('bench-press', 3, '8-10'),
        ex('seated-cable-row', 3, '10-12'),
        ex('dumbbell-shoulder-press', 3, '10-12'),
        ex('dumbbell-curl', 3, '10-12'),
        ex('cable-pushdown', 3, '10-12'),
      ], 45),
      workoutDay(2, 'Lower A', 'beginner-lower-a', [
        ex('squat', 3, '8-10'),
        ex('leg-press', 3, '10-12'),
        ex('leg-curl', 3, '10-12'),
        ex('calf-raise', 3, '12-15'),
      ], 40),
      restDay(3),
      workoutDay(4, 'Upper B', 'beginner-upper-b', [
        ex('incline-dumbbell-press', 3, '10-12'),
        ex('lat-pulldown', 3, '10-12'),
        ex('lateral-raise', 3, '12-15'),
        ex('hammer-curl', 3, '10-12'),
        ex('overhead-triceps-extension', 3, '10-12'),
      ], 45),
      workoutDay(5, 'Lower B', 'beginner-lower-b', [
        ex('romanian-deadlift', 3, '8-10'),
        ex('leg-extension', 3, '10-12'),
        ex('hip-thrust', 3, '10-12'),
        ex('calf-raise', 3, '12-15'),
      ], 40),
      restDay(6),
      restDay(7),
    ],
  },
  {
    id: 'intermediate-ppl',
    name: 'Push / Pull / Legs',
    level: 'Intermediate',
    daysPerWeek: 5,
    focus: 'Push/pull/legs split for balanced hypertrophy and strength',
    description: 'A five-day push/pull/legs rotation for lifters comfortable managing their own recovery and progression.',
    weeks: 10,
    schedule: [
      workoutDay(1, 'Push A', 'intermediate-push-a', [
        ex('bench-press', 4, '6-10'),
        ex('overhead-press', 3, '6-10'),
        ex('incline-dumbbell-press', 3, '8-12'),
        ex('lateral-raise', 3, '12-15'),
        ex('cable-pushdown', 3, '10-15'),
      ], 55),
      workoutDay(2, 'Pull A', 'intermediate-pull-a', [
        ex('barbell-row', 4, '6-10'),
        ex('lat-pulldown', 3, '8-12'),
        ex('seated-cable-row', 3, '10-12'),
        ex('face-pull', 3, '12-15'),
        ex('barbell-curl', 3, '8-12'),
      ], 55),
      workoutDay(3, 'Legs A', 'intermediate-legs-a', [
        ex('squat', 4, '5-8'),
        ex('leg-press', 3, '10-12'),
        ex('romanian-deadlift', 3, '6-10'),
        ex('leg-extension', 3, '10-15'),
        ex('calf-raise', 4, '12-20'),
      ], 55),
      restDay(4),
      workoutDay(5, 'Push B', 'intermediate-push-b', [
        ex('dumbbell-shoulder-press', 3, '8-12'),
        ex('chest-fly', 3, '10-15'),
        ex('push-up', 3, '10-20'),
        ex('face-pull', 3, '12-15'),
        ex('overhead-triceps-extension', 3, '10-15'),
      ], 50),
      workoutDay(6, 'Pull B', 'intermediate-pull-b', [
        ex('pull-up', 4, '4-10'),
        ex('barbell-row', 3, '8-12'),
        ex('seated-cable-row', 3, '10-12'),
        ex('hammer-curl', 3, '8-12'),
      ], 50),
      restDay(7),
    ],
  },
  {
    id: 'advanced-ppl',
    name: 'Push / Pull / Legs',
    level: 'Advanced',
    daysPerWeek: 6,
    focus: 'High-frequency push/pull/legs for experienced lifters',
    description: 'A six-day push/pull/legs cycle run twice per week, for lifters with established training experience.',
    weeks: 12,
    schedule: [
      workoutDay(1, 'Push A', 'advanced-push-a', [
        ex('bench-press', 5, '4-8'),
        ex('overhead-press', 4, '6-10'),
        ex('incline-dumbbell-press', 4, '8-12'),
        ex('lateral-raise', 4, '12-15'),
        ex('dips', 3, '6-12'),
        ex('cable-pushdown', 3, '10-15'),
      ], 65),
      workoutDay(2, 'Pull A', 'advanced-pull-a', [
        ex('pull-up', 5, '5-10'),
        ex('barbell-row', 4, '6-10'),
        ex('lat-pulldown', 3, '8-12'),
        ex('face-pull', 3, '12-15'),
        ex('barbell-curl', 3, '8-12'),
        ex('hammer-curl', 3, '8-12'),
      ], 65),
      workoutDay(3, 'Legs A', 'advanced-legs-a', [
        ex('squat', 5, '4-8'),
        ex('romanian-deadlift', 4, '6-10'),
        ex('leg-press', 3, '10-12'),
        ex('leg-curl', 3, '10-15'),
        ex('leg-extension', 3, '10-15'),
        ex('calf-raise', 4, '12-20'),
      ], 65),
      workoutDay(4, 'Push B', 'advanced-push-b', [
        ex('dumbbell-shoulder-press', 4, '8-12'),
        ex('chest-fly', 3, '10-15'),
        ex('push-up', 3, '10-20'),
        ex('face-pull', 3, '12-15'),
        ex('overhead-triceps-extension', 3, '10-15'),
        ex('cable-pushdown', 3, '10-15'),
      ], 60),
      workoutDay(5, 'Pull B', 'advanced-pull-b', [
        ex('barbell-row', 4, '6-10'),
        ex('seated-cable-row', 3, '10-12'),
        ex('lat-pulldown', 3, '8-12'),
        ex('dumbbell-curl', 3, '8-12'),
        ex('hammer-curl', 3, '8-12'),
      ], 55),
      workoutDay(6, 'Legs B', 'advanced-legs-b', [
        ex('hip-thrust', 4, '8-12'),
        ex('bulgarian-split-squat', 3, '8-12'),
        ex('leg-press', 3, '10-12'),
        ex('leg-curl', 3, '10-15'),
        ex('calf-raise', 4, '12-20'),
      ], 55),
      restDay(7),
    ],
  },
]

export function getProgramById(id: string): WorkoutProgram | undefined {
  return workoutPrograms.find((program) => program.id === id)
}
