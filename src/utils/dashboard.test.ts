import { describe, expect, it } from 'vitest'
import { getRemaining, getScoreLabel, getWeightTrendStatus, summarizeWorkout } from './dashboard'
import type { WorkoutSession } from '@/types/workout'

function makeSession(completed: boolean[][]): WorkoutSession {
  return {
    id: 'session',
    name: 'Test Session',
    programLevel: 'Intermediate',
    week: 1,
    day: 1,
    durationMinutes: 45,
    estimatedCalories: 300,
    completed: false,
    exercises: completed.map((sets, exerciseIndex) => ({
      id: `ex-${exerciseIndex}`,
      name: `Exercise ${exerciseIndex}`,
      muscleGroup: exerciseIndex === 0 ? 'Chest' : 'Back',
      targetReps: '8-10',
      restSeconds: 60,
      sets: sets.map((isDone, setIndex) => ({
        id: `set-${exerciseIndex}-${setIndex}`,
        reps: 10,
        weightKg: 20,
        completed: isDone,
      })),
    })),
  }
}

describe('summarizeWorkout', () => {
  it('counts an exercise as complete only when every set is complete', () => {
    const summary = summarizeWorkout(
      makeSession([
        [true, true],
        [true, false],
      ]),
    )
    expect(summary.totalExercises).toBe(2)
    expect(summary.completedExercises).toBe(1)
  })

  it('dedupes muscle groups while preserving order', () => {
    const summary = summarizeWorkout(makeSession([[true], [true], [true]]))
    expect(summary.muscleGroups).toEqual(['Chest', 'Back'])
  })
})

describe('getScoreLabel', () => {
  it('labels scores across the range', () => {
    expect(getScoreLabel(90, 100)).toBe('Excellent day')
    expect(getScoreLabel(78, 100)).toBe('Great day')
    expect(getScoreLabel(55, 100)).toBe('Good progress')
    expect(getScoreLabel(20, 100)).toBe("Let's build momentum")
  })
})

describe('getRemaining', () => {
  it('returns the positive difference', () => {
    expect(getRemaining(1680, 2200)).toBe(520)
  })

  it('never returns a negative amount', () => {
    expect(getRemaining(2500, 2200)).toBe(0)
  })
})

describe('getWeightTrendStatus', () => {
  it('is positive when the change moves toward the target', () => {
    expect(getWeightTrendStatus(-0.6, 72.4, 68)).toBe('positive')
  })

  it('is negative when the change moves away from the target', () => {
    expect(getWeightTrendStatus(0.6, 72.4, 68)).toBe('negative')
  })

  it('is neutral when there is no change', () => {
    expect(getWeightTrendStatus(0, 72.4, 68)).toBe('neutral')
  })
})
