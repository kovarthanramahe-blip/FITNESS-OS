import { describe, expect, it } from 'vitest'
import {
  buildHistoryEntry,
  estimateCaloriesBurned,
  formatElapsed,
  getCompletedExerciseCount,
  getCompletedSetCount,
  getElapsedSeconds,
  getExerciseVolumeKg,
  getLastPerformanceForExercise,
  getMuscleGroups,
  getProgramWorkoutOptions,
  getSessionVolumeKg,
  getSetVolumeKg,
  getTodaysWorkoutSummary,
  getTotalSetCount,
  getWorkoutMuscleGroups,
  instantiateWorkoutExercises,
  resolveProgramDay,
} from './workout'
import type { ProgramDay, WorkoutExercise, WorkoutSession, WorkoutSet } from '@/types/workout'
import { getProgramById, workoutPrograms } from '@/data/programs'

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id: 'set-1', setNumber: 1, weightKg: 60, reps: 8, completed: true, ...overrides }
}

function makeExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: 'ex-1',
    exerciseId: 'bench-press',
    name: 'Bench Press',
    muscleGroup: 'Chest',
    targetReps: '8-10',
    restSeconds: 90,
    sets: [makeSet()],
    ...overrides,
  }
}

function makeSession(exercises: WorkoutExercise[], overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    name: 'Push Day',
    level: 'Intermediate',
    startedAt: '2024-01-01T10:00:00.000Z',
    exercises,
    ...overrides,
  }
}

describe('set volume', () => {
  it('is weight times reps', () => {
    expect(getSetVolumeKg({ weightKg: 60, reps: 8 })).toBe(480)
  })

  it('is zero for an empty set', () => {
    expect(getSetVolumeKg({ weightKg: 0, reps: 0 })).toBe(0)
  })
})

describe('exercise volume', () => {
  it('sums only completed sets', () => {
    const exercise = makeExercise({
      sets: [
        makeSet({ id: 's1', weightKg: 60, reps: 8, completed: true }),
        makeSet({ id: 's2', weightKg: 60, reps: 8, completed: true }),
        makeSet({ id: 's3', weightKg: 65, reps: 5, completed: false }),
      ],
    })
    expect(getExerciseVolumeKg(exercise)).toBe(480 + 480)
  })
})

describe('workout (session) volume', () => {
  it('sums every exercise volume', () => {
    const session = makeSession([
      makeExercise({ sets: [makeSet({ weightKg: 60, reps: 8, completed: true })] }),
      makeExercise({ id: 'ex-2', sets: [makeSet({ weightKg: 40, reps: 10, completed: true })] }),
    ])
    expect(getSessionVolumeKg(session)).toBe(480 + 400)
  })
})

describe('workout progress', () => {
  it('counts completed and total sets', () => {
    const session = makeSession([
      makeExercise({
        sets: [makeSet({ id: 's1', completed: true }), makeSet({ id: 's2', completed: false })],
      }),
    ])
    expect(getCompletedSetCount(session)).toBe(1)
    expect(getTotalSetCount(session)).toBe(2)
  })

  it('counts an exercise as complete only once every set is done', () => {
    const session = makeSession([
      makeExercise({
        id: 'ex-done',
        sets: [makeSet({ id: 's1', completed: true }), makeSet({ id: 's2', completed: true })],
      }),
      makeExercise({
        id: 'ex-partial',
        sets: [makeSet({ id: 's3', completed: true }), makeSet({ id: 's4', completed: false })],
      }),
    ])
    expect(getCompletedExerciseCount(session)).toBe(1)
  })

  it('dedupes muscle groups', () => {
    expect(getMuscleGroups([{ muscleGroup: 'Chest' }, { muscleGroup: 'Chest' }, { muscleGroup: 'Triceps' }])).toEqual([
      'Chest',
      'Triceps',
    ])
  })
})

describe('elapsed time', () => {
  it('computes seconds between start and now', () => {
    const now = new Date('2024-01-01T10:01:30.000Z')
    expect(getElapsedSeconds('2024-01-01T10:00:00.000Z', now)).toBe(90)
  })

  it('uses completedAt over now once a session is finished', () => {
    const now = new Date('2024-01-01T11:00:00.000Z')
    const seconds = getElapsedSeconds('2024-01-01T10:00:00.000Z', now, '2024-01-01T10:05:00.000Z')
    expect(seconds).toBe(300)
  })

  it('never goes negative', () => {
    const now = new Date('2024-01-01T09:00:00.000Z')
    expect(getElapsedSeconds('2024-01-01T10:00:00.000Z', now)).toBe(0)
  })

  it('formats under an hour as mm:ss', () => {
    expect(formatElapsed(90)).toBe('1:30')
  })

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatElapsed(3725)).toBe('1:02:05')
  })
})

describe('estimateCaloriesBurned', () => {
  it('is a positive estimate that scales with duration and volume', () => {
    const short = estimateCaloriesBurned(30, 2000)
    const long = estimateCaloriesBurned(60, 4000)
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })
})

describe('resolveProgramDay', () => {
  const program = workoutPrograms[0]
  if (!program) throw new Error('expected a fixture program')

  it('wraps around the schedule length', () => {
    const day0 = resolveProgramDay(program, 0)
    const dayWrapped = resolveProgramDay(program, program.schedule.length)
    expect(dayWrapped).toEqual(day0)
  })

  it('handles negative indices by wrapping backward', () => {
    const lastDay = program.schedule[program.schedule.length - 1]
    expect(resolveProgramDay(program, -1)).toEqual(lastDay)
  })
})

describe('getProgramWorkoutOptions — every workout the user can choose for today', () => {
  it('PPL: offers Push, Pull and Legs, derived from the real program schedule — never hard-coded', () => {
    const ppl = getProgramById('intermediate-ppl')
    if (!ppl) throw new Error('expected the intermediate-ppl fixture program')

    const options = getProgramWorkoutOptions(ppl)
    const names = options.map((workout) => workout.name)

    expect(names).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B'])
    expect(names.some((name) => name.startsWith('Push'))).toBe(true)
    expect(names.some((name) => name.startsWith('Pull'))).toBe(true)
    expect(names.some((name) => name.startsWith('Legs'))).toBe(true)
  })

  it('excludes rest days from the choices', () => {
    const ppl = getProgramById('intermediate-ppl')
    if (!ppl) throw new Error('expected the intermediate-ppl fixture program')

    const options = getProgramWorkoutOptions(ppl)
    expect(options.some((workout) => workout.name === 'Rest')).toBe(false)
    expect(options).toHaveLength(5)
  })

  it('a non-PPL program (Beginner Full Body) shows its own actual days, deduplicated', () => {
    const fullBody = getProgramById('beginner-full-body')
    if (!fullBody) throw new Error('expected the beginner-full-body fixture program')

    // The schedule repeats "Full Body A" on both day 1 and day 5 — the picker
    // should offer it once, not twice.
    const names = getProgramWorkoutOptions(fullBody).map((workout) => workout.name)
    expect(names).toEqual(['Full Body A', 'Full Body B'])
  })

  it('a non-PPL program (Upper/Lower) shows Upper and Lower days, not Push/Pull/Legs', () => {
    const upperLower = getProgramById('beginner-upper-lower')
    if (!upperLower) throw new Error('expected the beginner-upper-lower fixture program')

    const names = getProgramWorkoutOptions(upperLower).map((workout) => workout.name)
    expect(names).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
  })

  it('advanced PPL (6-day) still dedupes correctly and includes both Legs A and Legs B', () => {
    const advanced = getProgramById('advanced-ppl')
    if (!advanced) throw new Error('expected the advanced-ppl fixture program')

    const names = getProgramWorkoutOptions(advanced).map((workout) => workout.name)
    expect(names).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'])
  })
})

describe('getWorkoutMuscleGroups', () => {
  it('derives muscle groups from the workout template exercises, deduplicated', () => {
    const ppl = getProgramById('intermediate-ppl')
    if (!ppl) throw new Error('expected the intermediate-ppl fixture program')

    const [pushA] = getProgramWorkoutOptions(ppl)
    if (!pushA) throw new Error('expected a Push A option')

    const groups = getWorkoutMuscleGroups(pushA)
    expect(groups.length).toBeGreaterThan(0)
    expect(new Set(groups).size).toBe(groups.length)
  })
})

describe('instantiateWorkoutExercises', () => {
  it('creates one unlogged set per configured set count', () => {
    const workout = program0Workout()
    const exercises = instantiateWorkoutExercises(workout)
    expect(exercises).toHaveLength(workout.exercises.length)
    expect(exercises[0]?.sets).toHaveLength(workout.exercises[0]?.sets ?? 0)
    expect(exercises[0]?.sets.every((set) => !set.completed && set.weightKg === 0)).toBe(true)
  })

  function program0Workout() {
    const workoutDay = workoutPrograms[0]?.schedule.find((day) => day.type === 'workout')
    if (!workoutDay || workoutDay.type !== 'workout') throw new Error('expected a workout day in fixture program')
    return workoutDay.workout
  }
})

describe('getLastPerformanceForExercise', () => {
  it('returns completed sets from the most recent session containing the exercise', () => {
    const older = makeSession(
      [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 55, reps: 8 })] })],
      { id: 'older', startedAt: '2024-01-01T10:00:00.000Z' },
    )
    const recent = makeSession(
      [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 60, reps: 8 })] })],
      { id: 'recent', startedAt: '2024-01-03T10:00:00.000Z' },
    )

    const result = getLastPerformanceForExercise('bench-press', [recent, older])
    expect(result).toEqual([expect.objectContaining({ weightKg: 60, reps: 8 })])
  })

  it('returns null when the exercise has no history', () => {
    expect(getLastPerformanceForExercise('bench-press', [])).toBeNull()
  })
})

describe('buildHistoryEntry', () => {
  it('summarizes a completed session', () => {
    const session = makeSession(
      [makeExercise({ sets: [makeSet({ weightKg: 60, reps: 8, completed: true })] })],
      {
        startedAt: '2024-01-01T10:00:00.000Z',
        completedAt: '2024-01-01T10:45:00.000Z',
      },
    )

    const entry = buildHistoryEntry(session, 1)

    expect(entry.durationMinutes).toBe(45)
    expect(entry.volumeKg).toBe(480)
    expect(entry.exerciseCount).toBe(1)
    expect(entry.setCount).toBe(1)
    expect(entry.personalRecordCount).toBe(1)
    expect(entry.estimatedCalories).toBeGreaterThan(0)
  })
})

describe('getTodaysWorkoutSummary — the dashboard reflects whatever is actually active', () => {
  const scheduledPushDay: ProgramDay = {
    day: 1,
    label: 'Push A',
    type: 'workout',
    workout: { id: 'intermediate-push-a', name: 'Push A', exercises: [{ exerciseId: 'bench-press', sets: 4, reps: '6-10' }], estimatedMinutes: 55 },
  }

  it('reflects the scheduled program day when there is no active session', () => {
    const summary = getTodaysWorkoutSummary(scheduledPushDay, null)
    expect(summary?.name).toBe('Push A')
  })

  it('reflects the active session — even when it is a different workout than the scheduled day', () => {
    const legsSession = makeSession([makeExercise({ exerciseId: 'squat', name: 'Squat', muscleGroup: 'Legs' })], {
      name: 'Legs A',
    })

    const summary = getTodaysWorkoutSummary(scheduledPushDay, legsSession)

    expect(summary?.name).toBe('Legs A')
    expect(summary?.name).not.toBe(scheduledPushDay.label)
  })

  it('reflects an active custom workout session too', () => {
    const customSession = makeSession([makeExercise({ exerciseId: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'Biceps' })], {
      name: 'Arm Day',
    })

    const summary = getTodaysWorkoutSummary(scheduledPushDay, customSession)

    expect(summary?.name).toBe('Arm Day')
  })
})
