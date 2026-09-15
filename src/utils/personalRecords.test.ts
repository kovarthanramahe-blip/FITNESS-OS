import { describe, expect, it } from 'vitest'
import { detectPersonalRecords, estimateOneRepMax, pickHeadlinePersonalRecord } from './personalRecords'
import type { PersonalRecord } from '@/types/progress'

describe('estimateOneRepMax', () => {
  it('applies the Epley formula', () => {
    // 60 * (1 + 8/30) = 76.0
    expect(estimateOneRepMax(60, 8)).toBeCloseTo(76, 1)
  })

  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
  })

  it('returns 0 for a blank or invalid set', () => {
    expect(estimateOneRepMax(0, 8)).toBe(0)
    expect(estimateOneRepMax(60, 0)).toBe(0)
  })
})

describe('detectPersonalRecords', () => {
  const priorRecords: PersonalRecord[] = [
    {
      id: 'pr-1',
      exercise: 'Bench Press',
      exerciseId: 'bench-press',
      weightKg: 60,
      reps: 8,
      date: '2024-01-01',
      type: 'heaviestWeight',
    },
    {
      id: 'pr-2',
      exercise: 'Bench Press',
      exerciseId: 'bench-press',
      weightKg: 70,
      reps: 5,
      date: '2024-01-01',
      type: 'estimatedOneRepMax',
      estimatedOneRepMax: 82,
    },
  ]

  it('detects no PR for a blank set', () => {
    expect(detectPersonalRecords('bench-press', { weightKg: 0, reps: 0 }, priorRecords)).toEqual([])
  })

  it('detects no PR when the set does not beat any prior record', () => {
    const results = detectPersonalRecords('bench-press', { weightKg: 55, reps: 6 }, priorRecords)
    expect(results).toEqual([])
  })

  it('detects a heaviest-weight PR', () => {
    const results = detectPersonalRecords('bench-press', { weightKg: 75, reps: 6 }, priorRecords)
    expect(results.some((r) => r.type === 'heaviestWeight' && r.weightKg === 75)).toBe(true)
  })

  it('detects a most-reps-at-weight PR without requiring a new heaviest weight', () => {
    const results = detectPersonalRecords('bench-press', { weightKg: 60, reps: 9 }, priorRecords)
    expect(results).toEqual([expect.objectContaining({ type: 'mostRepsAtWeight', reps: 9, weightKg: 60 })])
  })

  it('detects an estimated 1RM PR', () => {
    // 62.5 * (1 + 6/30) = 75 -> below the existing 82 estimate, so should NOT PR
    const noPr = detectPersonalRecords('bench-press', { weightKg: 62.5, reps: 6 }, priorRecords)
    expect(noPr.some((r) => r.type === 'estimatedOneRepMax')).toBe(false)

    // 70 * (1 + 6/30) = 84 -> beats 82
    const withPr = detectPersonalRecords('bench-press', { weightKg: 70, reps: 6 }, priorRecords)
    expect(withPr.some((r) => r.type === 'estimatedOneRepMax')).toBe(true)
  })

  it('is scoped per exercise', () => {
    const results = detectPersonalRecords('squat', { weightKg: 40, reps: 5 }, priorRecords)
    expect(results.some((r) => r.type === 'heaviestWeight')).toBe(true)
  })
})

describe('pickHeadlinePersonalRecord', () => {
  it('returns null when nothing was detected', () => {
    expect(pickHeadlinePersonalRecord([])).toBeNull()
  })

  it('prioritizes heaviest weight over the other record types', () => {
    const headline = pickHeadlinePersonalRecord([
      { type: 'mostRepsAtWeight', weightKg: 60, reps: 10 },
      { type: 'heaviestWeight', weightKg: 65, reps: 6 },
      { type: 'estimatedOneRepMax', weightKg: 65, reps: 6, estimatedOneRepMax: 78 },
    ])
    expect(headline?.type).toBe('heaviestWeight')
  })
})
