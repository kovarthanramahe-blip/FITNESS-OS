import { describe, expect, it } from 'vitest'
import { evaluateBadges } from './badgeEngine'
import type { BadgeContext } from './badgeEngine'
import type { ActivitySnapshot } from './gamification'

const NOW = new Date('2024-06-10T12:00:00.000Z')

function emptySnapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    workoutHistory: [],
    personalRecords: [],
    foodEntries: [],
    habits: [],
    habitEntries: [],
    waterLogs: [],
    waterGoal: { goalMl: 2000, preferredUnit: 'l' },
    weightLogs: [],
    measurements: [],
    todayProgramDayType: null,
    now: NOW,
    ...overrides,
  }
}

function context(overrides: Partial<ActivitySnapshot> = {}, totalXp = 0): BadgeContext {
  return { snapshot: emptySnapshot(overrides), totalXp }
}

describe('evaluateBadges', () => {
  it('earns nothing from an empty snapshot', () => {
    expect(evaluateBadges(context(), [])).toEqual([])
  })

  it('earns first-workout after a single completed session', () => {
    const ctx = context({
      workoutHistory: [{ id: 'h1', sessionId: 's1', date: '2024-06-01T18:00:00.000Z', name: 'Push A', durationMinutes: 40, volumeKg: 500, exerciseCount: 4, setCount: 12, personalRecordCount: 0, estimatedCalories: 300 }],
    })
    const earned = evaluateBadges(ctx, [])
    expect(earned.map((b) => b.id)).toContain('first-workout')
  })

  it('earns pr-club after 1 personal record', () => {
    const ctx = context({ personalRecords: [{ id: 'pr1', exercise: 'Squat', weightKg: 100, reps: 5, date: '2024-06-01T00:00:00.000Z', exerciseId: 'squat' }] })
    expect(evaluateBadges(ctx, []).map((b) => b.id)).toContain('pr-club')
  })

  it('does not earn iron-will with fewer than 5 PRs', () => {
    const prs = Array.from({ length: 4 }, (_, i) => ({ id: `pr${i}`, exercise: 'Squat', weightKg: 100, reps: 5, date: '2024-06-01T00:00:00.000Z', exerciseId: 'squat' }))
    expect(evaluateBadges(context({ personalRecords: prs }), []).map((b) => b.id)).not.toContain('iron-will')
  })

  it('earns century once 100 total sets are logged', () => {
    const entry = { id: 'h1', sessionId: 's1', date: '2024-06-01T18:00:00.000Z', name: 'Push A', durationMinutes: 40, volumeKg: 500, exerciseCount: 4, setCount: 100, personalRecordCount: 0, estimatedCalories: 300 }
    expect(evaluateBadges(context({ workoutHistory: [entry] }), []).map((b) => b.id)).toContain('century')
  })

  it('earns hydrated after reaching the water goal on 7 distinct days', () => {
    const waterLogs = Array.from({ length: 7 }, (_, i) => ({ id: `w${i}`, date: `2024-06-0${i + 1}`, amountMl: 2500, createdAt: '' }))
    expect(evaluateBadges(context({ waterLogs }), []).map((b) => b.id)).toContain('hydrated')
  })

  it('earns level-10 once total XP reaches level 10', () => {
    const level10Xp = 100 + 150 + 200 + 250 + 300 + 350 + 400 + 450 + 500 // sum of levels 1-9 requirements
    expect(evaluateBadges(context({}, level10Xp), []).map((b) => b.id)).toContain('level-10')
    expect(evaluateBadges(context({}, level10Xp - 1), []).map((b) => b.id)).not.toContain('level-10')
  })

  it('never re-earns a badge already in alreadyEarnedIds (idempotent)', () => {
    const ctx = context({ personalRecords: [{ id: 'pr1', exercise: 'Squat', weightKg: 100, reps: 5, date: '2024-06-01T00:00:00.000Z', exerciseId: 'squat' }] })
    const firstPass = evaluateBadges(ctx, [])
    expect(firstPass.map((b) => b.id)).toContain('pr-club')

    const secondPass = evaluateBadges(ctx, firstPass.map((b) => b.id))
    expect(secondPass.map((b) => b.id)).not.toContain('pr-club')
  })
})
