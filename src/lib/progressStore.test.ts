import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onStorageFailure, resetStorageHealthForTests } from '@/lib/localStorageHealth'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addMeasurement,
  addWeightLog,
  deleteMeasurement,
  deleteWeightLog,
  getProgressState,
  mergeProgressFromCloud,
  resetProgressStoreForTests,
  setWeightGoal,
  updateMeasurement,
  updateWeightLog,
} from './progressStore'

beforeEach(() => {
  resetProgressStoreForTests()
})

describe('weight logs', () => {
  it('adds a new weight entry', () => {
    const before = getProgressState().weightLogs.length
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })

    const state = getProgressState()
    expect(state.weightLogs).toHaveLength(before + 1)
    expect(state.weightLogs.at(-1)).toMatchObject({ date: '2024-06-01', weightKg: 71.2 })
  })

  it('edits an existing weight entry', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })
    const entry = getProgressState().weightLogs.at(-1)
    expect(entry).toBeDefined()

    updateWeightLog(entry!.id, { weightKg: 70.5, note: 'after workout' })

    const updated = getProgressState().weightLogs.find((log) => log.id === entry!.id)
    expect(updated?.weightKg).toBe(70.5)
    expect(updated?.note).toBe('after workout')
  })

  it('deletes a weight entry', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })
    const entry = getProgressState().weightLogs.at(-1)
    const countBefore = getProgressState().weightLogs.length

    deleteWeightLog(entry!.id)

    expect(getProgressState().weightLogs).toHaveLength(countBefore - 1)
    expect(getProgressState().weightLogs.some((log) => log.id === entry!.id)).toBe(false)
  })

  it('updates the weight goal', () => {
    setWeightGoal({ targetWeightKg: 65 })
    expect(getProgressState().weightGoal.targetWeightKg).toBe(65)
  })
})

describe('body measurements', () => {
  it('adds, edits and deletes a measurement', () => {
    const before = getProgressState().measurements.length
    addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })

    const added = getProgressState().measurements.at(-1)
    expect(getProgressState().measurements).toHaveLength(before + 1)
    expect(added).toMatchObject({ type: 'Waist', value: 82, unit: 'cm' })

    updateMeasurement(added!.id, { value: 81 })
    expect(getProgressState().measurements.find((m) => m.id === added!.id)?.value).toBe(81)

    deleteMeasurement(added!.id)
    expect(getProgressState().measurements).toHaveLength(before)
  })

  it('supports a custom measurement type', () => {
    addMeasurement({ type: 'Neck', date: '2024-06-01', value: 38, unit: 'cm' })
    expect(getProgressState().measurements.some((m) => m.type === 'Neck')).toBe(true)
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetProgressStoreForTests()
  })

  it('starts a new authenticated user with no weight logs or measurements', () => {
    setCurrentUserId('user-1')
    resetProgressStoreForTests()

    const state = getProgressState()
    expect(state.weightLogs).toEqual([])
    expect(state.measurements).toEqual([])
    expect(state.weightGoal.startingWeightKg).toBe(0)
    expect(state.weightGoal.targetWeightKg).toBe(0)
  })

  it('keeps guest/demo mode seeded with mock data', () => {
    setCurrentUserId('user-1')
    resetProgressStoreForTests()
    setCurrentUserId(null)
    resetProgressStoreForTests()

    const state = getProgressState()
    expect(state.weightLogs.length).toBeGreaterThan(0)
    expect(state.measurements.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetProgressStoreForTests()
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    expect(getProgressState().weightLogs).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getProgressState().weightLogs).toEqual([])
  })
})

describe('mergeProgressFromCloud', () => {
  beforeEach(() => {
    setCurrentUserId('user-merge-test')
    resetProgressStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('unions cloud and local-only weight logs, keeping both', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const localOnlyId = getProgressState().weightLogs[0]!.id

    const { localOnlyWeightLogs } = mergeProgressFromCloud({
      weightLogs: [{ id: 'cloud-1', date: '2024-06-02', weightKg: 79 }],
      weightGoal: null,
      measurements: [],
    })

    expect(localOnlyWeightLogs.map((l) => l.id)).toEqual([localOnlyId])
    const ids = getProgressState().weightLogs.map((l) => l.id).sort()
    expect(ids).toEqual([localOnlyId, 'cloud-1'].sort())
  })

  it('cloud wins when the same id exists on both sides — never a duplicate row', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const sharedId = getProgressState().weightLogs[0]!.id

    mergeProgressFromCloud({
      weightLogs: [{ id: sharedId, date: '2024-06-01', weightKg: 81, note: 'synced elsewhere' }],
      weightGoal: null,
      measurements: [],
    })

    const logs = getProgressState().weightLogs
    expect(logs).toHaveLength(1)
    expect(logs[0]).toEqual({ id: sharedId, date: '2024-06-01', weightKg: 81, note: 'synced elsewhere' })
  })

  it('a null cloud goal leaves the local goal in place and reports it for push-back when non-default', () => {
    setWeightGoal({ startingWeightKg: 90, targetWeightKg: 80, startDate: '2024-01-01' })

    const { weightGoalToPush } = mergeProgressFromCloud({ weightLogs: [], weightGoal: null, measurements: [] })

    expect(weightGoalToPush).toEqual(getProgressState().weightGoal)
  })

  it('does not push back a still-default zero weight goal', () => {
    const { weightGoalToPush } = mergeProgressFromCloud({ weightLogs: [], weightGoal: null, measurements: [] })
    expect(weightGoalToPush).toBeNull()
  })

  it('a present cloud goal replaces the local goal', () => {
    setWeightGoal({ startingWeightKg: 90, targetWeightKg: 80, startDate: '2024-01-01' })
    const cloudGoal = { startingWeightKg: 88, targetWeightKg: 75, startDate: '2024-02-01' }

    mergeProgressFromCloud({ weightLogs: [], weightGoal: cloudGoal, measurements: [] })

    expect(getProgressState().weightGoal).toEqual(cloudGoal)
  })
})

describe('local persistence', () => {
  beforeEach(() => {
    resetStorageHealthForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a successful write behaves exactly as before: the mutation is readable back from localStorage', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })

    const raw = window.localStorage.getItem('fitness-os:progress-store:v1')
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw!) as { weightLogs: unknown[] }
    expect(persisted.weightLogs).toEqual(getProgressState().weightLogs)
  })

  it('a failed localStorage write never crashes the mutation, and the in-memory state still updates', () => {
    const before = getProgressState().weightLogs.length
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => addWeightLog({ date: '2024-06-01', weightKg: 80 })).not.toThrow()

    expect(getProgressState().weightLogs).toHaveLength(before + 1)
  })

  it('a failed write notifies exactly once via the shared storage-health channel', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const listener = vi.fn()
    onStorageFailure(listener)

    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    addWeightLog({ date: '2024-06-02', weightKg: 79.5 })

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
