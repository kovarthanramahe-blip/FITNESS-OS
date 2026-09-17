import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgressCalendar } from './useProgressCalendar'
import { useHabitStore } from '@/lib/habitStore'
import type { HabitStoreState } from '@/lib/habitStore'
import { useNutritionStore } from '@/lib/nutritionStore'
import type { NutritionStoreState } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import type { ProgressStoreState } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
import type { WorkoutStoreState } from '@/lib/workoutStore'
import type { WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry } from '@/types/workout'

vi.mock('@/lib/progressStore')
vi.mock('@/lib/workoutStore')
vi.mock('@/lib/nutritionStore')
vi.mock('@/lib/habitStore')

const mockedUseProgressStore = vi.mocked(useProgressStore)
const mockedUseWorkoutStore = vi.mocked(useWorkoutStore)
const mockedUseNutritionStore = vi.mocked(useNutritionStore)
const mockedUseHabitStore = vi.mocked(useHabitStore)

function setStores(overrides: { weightLogs?: WeightLog[]; workoutHistory?: WorkoutHistoryEntry[] } = {}) {
  const progressState: ProgressStoreState = {
    weightLogs: overrides.weightLogs ?? [],
    weightGoal: { startingWeightKg: 0, targetWeightKg: 0, startDate: '2026-01-01' },
    measurements: [],
  }
  const workoutState: WorkoutStoreState = {
    selectedProgramId: null,
    currentDayIndex: 0,
    activeSession: null,
    activeSessionPrIds: [],
    activeSessionIsScheduled: false,
    history: overrides.workoutHistory ?? [],
    personalRecords: [],
    customWorkouts: [],
    celebration: null,
    lastCompletedSummary: null,
  }
  const nutritionState: NutritionStoreState = {
    entries: [],
    goal: { dailyCalories: 2000, proteinGrams: 150, carbohydrateGrams: 200, fatGrams: 60, fiberGrams: 30 },
  }
  const habitState: HabitStoreState = {
    habits: [],
    entries: [],
    waterLogs: [],
    waterGoal: { goalMl: 2500, preferredUnit: 'l' },
  }

  mockedUseProgressStore.mockReturnValue(progressState)
  mockedUseWorkoutStore.mockReturnValue(workoutState)
  mockedUseNutritionStore.mockReturnValue(nutritionState)
  mockedUseHabitStore.mockReturnValue(habitState)
}

beforeEach(() => {
  setStores()
})

describe('useProgressCalendar — current-day detection', () => {
  it("reports 'today' as the injected now date, in local yyyy-mm-dd form", () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current.today).toBe('2026-09-16')
  })

  it('opens on the month containing `now` by default', () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current.year).toBe(2026)
    expect(result.current.month).toBe(8)
    expect(result.current.monthLabel).toBe('September 2026')
  })
})

describe('useProgressCalendar — month navigation', () => {
  it('moves forward a month, including across a year boundary', () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 11, 16)))
    act(() => result.current.goToNextMonth())
    expect(result.current.year).toBe(2027)
    expect(result.current.month).toBe(0)
  })

  it('moves back a month, including across a year boundary', () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2027, 0, 16)))
    act(() => result.current.goToPreviousMonth())
    expect(result.current.year).toBe(2026)
    expect(result.current.month).toBe(11)
  })

  it('does not touch the range-selector state — this hook has no notion of 7D/30D/etc.', () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current).not.toHaveProperty('range')
  })
})

describe('useProgressCalendar — getActivity reflects the visible stores', () => {
  it('reflects a workout indicator for the injected history', () => {
    setStores({
      workoutHistory: [
        {
          id: 'h1',
          sessionId: 's1',
          date: '2026-09-16T18:00:00.000Z',
          name: 'Push Day',
          durationMinutes: 40,
          volumeKg: 1000,
          exerciseCount: 4,
          setCount: 12,
          personalRecordCount: 0,
          estimatedCalories: 300,
        },
      ],
    })
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current.getActivity('2026-09-16').workout).toBe(true)
    expect(result.current.getActivity('2026-09-15').workout).toBe(false)
  })

  it('reflects a weight indicator for the injected weight logs', () => {
    setStores({ weightLogs: [{ id: 'w1', date: '2026-09-16', weightKg: 78.4 }] })
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current.getActivity('2026-09-16').weightKg).toBe(78.4)
  })

  it('reports no activity for a day with nothing recorded', () => {
    const { result } = renderHook(() => useProgressCalendar(new Date(2026, 8, 16)))
    expect(result.current.getActivity('2026-09-16').hasActivity).toBe(false)
  })
})
