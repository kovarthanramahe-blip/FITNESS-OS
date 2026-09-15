import { describe, expect, it } from 'vitest'
import type { ActivitySnapshot } from './gamification'
import {
  awardXpOnce,
  deriveEligibleXpEvents,
  getLevelForXp,
  getLevelProgressPercent,
  getLevelTitle,
  getTotalXp,
  getXpIntoCurrentLevel,
  getXpRequiredForLevel,
  getXpToNextLevel,
  hasAwardedXp,
  reconcileNewXpEvents,
  sortXpEventsRecentFirst,
} from './gamification'
import type { XPEvent } from '@/types/gamification'

function emptySnapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    workoutHistory: [],
    personalRecords: [],
    foodEntries: [],
    habits: [],
    habitEntries: [],
    waterLogs: [],
    waterGoal: { goalMl: 2500, preferredUnit: 'l' },
    weightLogs: [],
    measurements: [],
    todayProgramDayType: null,
    now: new Date('2024-06-10T12:00:00.000Z'),
    ...overrides,
  }
}

describe('level system', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(getLevelForXp(0)).toBe(1)
    expect(getXpIntoCurrentLevel(0)).toBe(0)
    expect(getLevelProgressPercent(0)).toBe(0)
  })

  it('handles negative/invalid XP without NaN', () => {
    expect(getLevelForXp(-500)).toBe(1)
    expect(Number.isNaN(getLevelForXp(Number.NaN))).toBe(false)
  })

  it('advances exactly at a level boundary', () => {
    const required = getXpRequiredForLevel(1)
    expect(getLevelForXp(required - 1)).toBe(1)
    expect(getLevelForXp(required)).toBe(2)
    expect(getXpIntoCurrentLevel(required)).toBe(0)
  })

  it('computes xp into/remaining for the current level consistently', () => {
    const xp = 2450
    const level = getLevelForXp(xp)
    const into = getXpIntoCurrentLevel(xp)
    const toNext = getXpToNextLevel(xp)
    const required = getXpRequiredForLevel(level)
    expect(into + toNext).toBe(required)
    expect(getLevelProgressPercent(xp)).toBeCloseTo((into / required) * 100, 5)
  })

  it('never returns NaN/Infinity for very high XP', () => {
    const huge = Number.MAX_SAFE_INTEGER
    const level = getLevelForXp(huge)
    expect(Number.isFinite(level)).toBe(true)
    expect(Number.isFinite(getXpIntoCurrentLevel(huge))).toBe(true)
    expect(Number.isFinite(getXpToNextLevel(huge))).toBe(true)
    expect(Number.isFinite(getLevelProgressPercent(huge))).toBe(true)
  })

  it('keeps progress within 0-100', () => {
    expect(getLevelProgressPercent(0)).toBeGreaterThanOrEqual(0)
    expect(getLevelProgressPercent(Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(100)
  })

  it('supports at least level 50 and beyond with a stable title', () => {
    expect(getLevelTitle(1)).toBe('Beginner')
    expect(getLevelTitle(12)).toBe('Consistency Builder')
    expect(getLevelTitle(50)).toBe('Legend')
    expect(getLevelTitle(75)).toBe('Legend')
  })
})

describe('deriveEligibleXpEvents', () => {
  it('produces no events from an empty snapshot', () => {
    expect(deriveEligibleXpEvents(emptySnapshot())).toEqual([])
  })

  it('awards one workout XP event per completed session', () => {
    const snapshot = emptySnapshot({
      workoutHistory: [
        { id: 'h1', sessionId: 's1', date: '2024-06-01T18:00:00.000Z', name: 'Push A', durationMinutes: 50, volumeKg: 1000, exerciseCount: 5, setCount: 15, personalRecordCount: 0, estimatedCalories: 400 },
      ],
    })
    const events = deriveEligibleXpEvents(snapshot)
    expect(events.filter((e) => e.type === 'workout_session_complete')).toHaveLength(1)
    expect(events[0]!.id).toBe('workout-session-h1')
  })

  it('caps nutrition-log XP at once per day regardless of entry count (anti-farming)', () => {
    const snapshot = emptySnapshot({
      foodEntries: [
        { id: 'f1', foodId: 'food-1', foodName: 'Oats', meal: 'breakfast', quantity: 1, servingUnit: 'bowl', calories: 300, protein: 10, carbohydrates: 40, fat: 5, fiber: 4, date: '2024-06-01', createdAt: '2024-06-01T08:00:00.000Z' },
        { id: 'f2', foodId: 'food-1', foodName: 'Oats', meal: 'breakfast', quantity: 1, servingUnit: 'bowl', calories: 300, protein: 10, carbohydrates: 40, fat: 5, fiber: 4, date: '2024-06-01', createdAt: '2024-06-01T08:05:00.000Z' },
        { id: 'f3', foodId: 'food-1', foodName: 'Oats', meal: 'breakfast', quantity: 1, servingUnit: 'bowl', calories: 300, protein: 10, carbohydrates: 40, fat: 5, fiber: 4, date: '2024-06-01', createdAt: '2024-06-01T08:10:00.000Z' },
      ],
    })
    const events = deriveEligibleXpEvents(snapshot)
    expect(events.filter((e) => e.type === 'nutrition_log')).toHaveLength(1)
    // 3 entries but all the same meal type — daily-complete threshold (3 distinct meals) isn't met.
    expect(events.filter((e) => e.type === 'nutrition_daily_complete')).toHaveLength(0)
  })

  it('awards daily nutrition completion once 3 distinct meals are logged', () => {
    const base = { foodId: 'f', foodName: 'Food', quantity: 1, servingUnit: 'serving', calories: 200, protein: 5, carbohydrates: 20, fat: 5, fiber: 2, date: '2024-06-01', createdAt: '2024-06-01T08:00:00.000Z' }
    const snapshot = emptySnapshot({
      foodEntries: [
        { ...base, id: 'f1', meal: 'breakfast' },
        { ...base, id: 'f2', meal: 'lunch' },
        { ...base, id: 'f3', meal: 'dinner' },
      ],
    })
    const events = deriveEligibleXpEvents(snapshot)
    expect(events.filter((e) => e.type === 'nutrition_daily_complete')).toHaveLength(1)
  })

  it('awards habit daily target only when every scheduled active habit is completed', () => {
    const habit = { id: 'h1', name: 'Stretch', icon: 'sparkles' as const, category: 'wellness' as const, frequency: { type: 'daily' as const }, target: 1, reminderEnabled: false, active: true, createdAt: '2024-05-01T00:00:00.000Z' }
    const habit2 = { ...habit, id: 'h2', name: 'Walk' }

    const partial = emptySnapshot({
      habits: [habit, habit2],
      habitEntries: [{ id: 'e1', habitId: 'h1', date: '2024-06-01', completedAt: '2024-06-01T09:00:00.000Z' }],
    })
    expect(deriveEligibleXpEvents(partial).filter((e) => e.type === 'habit_daily_target')).toHaveLength(0)

    const full = emptySnapshot({
      habits: [habit, habit2],
      habitEntries: [
        { id: 'e1', habitId: 'h1', date: '2024-06-01', completedAt: '2024-06-01T09:00:00.000Z' },
        { id: 'e2', habitId: 'h2', date: '2024-06-01', completedAt: '2024-06-01T09:05:00.000Z' },
      ],
    })
    expect(deriveEligibleXpEvents(full).filter((e) => e.type === 'habit_daily_target')).toHaveLength(1)
  })

  it('keys habit-complete XP by (habit, date), not by entry id, so uncomplete+recomplete cannot farm XP', () => {
    const first = emptySnapshot({
      habitEntries: [{ id: 'entry-1', habitId: 'h1', date: '2024-06-01', completedAt: '' }],
    })
    // Simulates uncompleting (which deletes the entry) then completing again —
    // the new entry gets a fresh id, but should map to the same event id.
    const second = emptySnapshot({
      habitEntries: [{ id: 'entry-2', habitId: 'h1', date: '2024-06-01', completedAt: '' }],
    })
    const firstEvent = deriveEligibleXpEvents(first).find((e) => e.type === 'habit_complete')
    const secondEvent = deriveEligibleXpEvents(second).find((e) => e.type === 'habit_complete')
    expect(firstEvent?.id).toBe(secondEvent?.id)
  })

  it('caps weight-log XP at one per date, immune to delete + re-add cycling', () => {
    const first = emptySnapshot({ weightLogs: [{ id: 'w1', date: '2024-06-01', weightKg: 80 }] })
    const second = emptySnapshot({ weightLogs: [{ id: 'w2', date: '2024-06-01', weightKg: 80.2 }] })
    const firstEvent = deriveEligibleXpEvents(first).find((e) => e.type === 'weight_log')
    const secondEvent = deriveEligibleXpEvents(second).find((e) => e.type === 'weight_log')
    expect(firstEvent?.id).toBe(secondEvent?.id)
  })

  it('caps body-measurement XP at one per (type, date), immune to delete + re-add cycling', () => {
    const first = emptySnapshot({ measurements: [{ id: 'm1', type: 'Waist', date: '2024-06-01', value: 80, unit: 'cm' }] })
    const second = emptySnapshot({ measurements: [{ id: 'm2', type: 'Waist', date: '2024-06-01', value: 79, unit: 'cm' }] })
    const firstEvent = deriveEligibleXpEvents(first).find((e) => e.type === 'body_measurement_log')
    const secondEvent = deriveEligibleXpEvents(second).find((e) => e.type === 'body_measurement_log')
    expect(firstEvent?.id).toBe(secondEvent?.id)
  })

  it('awards water-goal XP only on days the goal was actually reached', () => {
    const snapshot = emptySnapshot({
      waterGoal: { goalMl: 2000, preferredUnit: 'l' },
      waterLogs: [
        { id: 'w1', date: '2024-06-01', amountMl: 1000, createdAt: '2024-06-01T08:00:00.000Z' },
        { id: 'w2', date: '2024-06-02', amountMl: 2500, createdAt: '2024-06-02T08:00:00.000Z' },
      ],
    })
    const events = deriveEligibleXpEvents(snapshot).filter((e) => e.type === 'water_goal_reached')
    expect(events).toHaveLength(1)
    expect(events[0]!.sourceId).toBe('2024-06-02')
  })
})

describe('XP idempotency', () => {
  const event: XPEvent = { id: 'weight-log-w1', type: 'weight_log', amount: 10, date: '2024-06-01', sourceId: 'w1', description: 'Logged weight' }

  it('hasAwardedXp / awardXpOnce never double-award the same id', () => {
    expect(hasAwardedXp([], event.id)).toBe(false)
    const once = awardXpOnce([], event)
    expect(once).toHaveLength(1)
    const twice = awardXpOnce(once, event)
    expect(twice).toHaveLength(1)
    expect(twice).toBe(once) // no new array created when nothing changed
  })

  it('reconcileNewXpEvents only returns events not already recorded', () => {
    const eligible = [event, { ...event, id: 'weight-log-w2', sourceId: 'w2' }]
    const existing = [event]
    const fresh = reconcileNewXpEvents(existing, eligible)
    expect(fresh).toHaveLength(1)
    expect(fresh[0]!.id).toBe('weight-log-w2')
  })

  it('recomputing from unchanged data yields nothing new (rerender-safe)', () => {
    const snapshot = emptySnapshot({
      weightLogs: [{ id: 'w1', date: '2024-06-01', weightKg: 80 }],
    })
    const first = deriveEligibleXpEvents(snapshot)
    const recorded = reconcileNewXpEvents([], first)
    const second = deriveEligibleXpEvents(snapshot)
    const newOnSecondPass = reconcileNewXpEvents(recorded, second)
    expect(newOnSecondPass).toHaveLength(0)
  })
})

describe('getTotalXp / sortXpEventsRecentFirst', () => {
  it('sums to 0 for no events', () => {
    expect(getTotalXp([])).toBe(0)
  })

  it('sums event amounts', () => {
    const events: XPEvent[] = [
      { id: '1', type: 'weight_log', amount: 10, date: '2024-06-01', sourceId: '1', description: '' },
      { id: '2', type: 'weight_log', amount: 20, date: '2024-06-02', sourceId: '2', description: '' },
    ]
    expect(getTotalXp(events)).toBe(30)
  })

  it('sorts most recent date first', () => {
    const events: XPEvent[] = [
      { id: '1', type: 'weight_log', amount: 10, date: '2024-06-01', sourceId: '1', description: 'old' },
      { id: '2', type: 'weight_log', amount: 10, date: '2024-06-05', sourceId: '2', description: 'new' },
    ]
    expect(sortXpEventsRecentFirst(events).map((e) => e.description)).toEqual(['new', 'old'])
  })
})
