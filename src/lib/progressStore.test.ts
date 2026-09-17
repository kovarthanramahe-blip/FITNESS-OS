import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onStorageFailure, resetStorageHealthForTests } from '@/lib/localStorageHealth'
import { mapMeasurementRow, mapWeightLogRow } from '@/lib/repositories/cloud/mappers'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addMeasurement,
  addWeightLog,
  deleteMeasurement,
  deleteWeightLog,
  getProgressState,
  mergeProgressFromCloud,
  purgeLegacyServerIdMeasurements,
  purgeLegacyServerIdWeightLogs,
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

  // Regression for the double-counting bug: a record already pushed to the
  // cloud comes back on the next hydration wrapped in a row whose `id` is
  // Supabase's own server-generated primary key — never the same string as
  // the local, client-generated id — while `client_log_id`/
  // `client_measurement_id` carries the original id through unchanged. Only
  // `mapWeightLogRow`/`mapMeasurementRow` (not this test) decide which one
  // becomes `WeightLog.id`/`BodyMeasurement.id`; feeding their real output
  // in here is what makes this test fail against the old
  // `id: row.id` mapper (which duplicated every already-synced record on
  // the very next hydration/app-reopen) and pass against the fix.
  it('hydrating the same already-synced weight log and measurement repeatedly (closing/reopening the app) never duplicates them', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const localLogId = getProgressState().weightLogs[0]!.id
    addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })
    const localMeasurementId = getProgressState().measurements[0]!.id

    const cloudLog = mapWeightLogRow({
      id: 'server-generated-uuid-1',
      user_id: 'user-merge-test',
      client_log_id: localLogId,
      log_date: '2024-06-01',
      weight_kg: 80,
      note: null,
      created_at: '2024-06-01T00:00:00.000Z',
    })
    const cloudMeasurement = mapMeasurementRow({
      id: 'server-generated-uuid-2',
      user_id: 'user-merge-test',
      client_measurement_id: localMeasurementId,
      measurement_type: 'Waist',
      log_date: '2024-06-01',
      value: 82,
      unit: 'cm',
      note: null,
      created_at: '2024-06-01T00:00:00.000Z',
    })

    // First hydration after the push round-trip — the cloud copy is the
    // very same record, so nothing should be added.
    mergeProgressFromCloud({ weightLogs: [cloudLog], weightGoal: null, measurements: [cloudMeasurement] })
    expect(getProgressState().weightLogs).toHaveLength(1)
    expect(getProgressState().measurements).toHaveLength(1)

    // Close the app and reopen it (repeatedly) — the same cloud data comes
    // back every time; the count must never grow.
    mergeProgressFromCloud({ weightLogs: [cloudLog], weightGoal: null, measurements: [cloudMeasurement] })
    mergeProgressFromCloud({ weightLogs: [cloudLog], weightGoal: null, measurements: [cloudMeasurement] })

    expect(getProgressState().weightLogs).toHaveLength(1)
    expect(getProgressState().weightLogs[0]!.id).toBe(localLogId)
    expect(getProgressState().measurements).toHaveLength(1)
    expect(getProgressState().measurements[0]!.id).toBe(localMeasurementId)
  })
})

describe('purgeLegacyServerId(WeightLogs|Measurements) (one-time local-duplicate cleanup)', () => {
  beforeEach(() => {
    setCurrentUserId('user-purge-test')
    resetProgressStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  // TEST A
  it('does nothing for a fresh store with no records at all', () => {
    expect(purgeLegacyServerIdWeightLogs(['server-uuid'])).toEqual([])
    expect(purgeLegacyServerIdMeasurements(['server-uuid'])).toEqual([])
    expect(getProgressState().weightLogs).toEqual([])
    expect(getProgressState().measurements).toEqual([])
  })

  // TEST B
  it('removes a legacy server-id-keyed weight log and measurement while keeping the canonical client-id copies', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const canonicalLog = getProgressState().weightLogs[0]!
    addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })
    const canonicalMeasurement = getProgressState().measurements[0]!

    mergeProgressFromCloud({
      weightLogs: [{ ...canonicalLog, id: 'server-log-uuid' }],
      weightGoal: null,
      measurements: [{ ...canonicalMeasurement, id: 'server-measurement-uuid' }],
    })
    expect(getProgressState().weightLogs).toHaveLength(2)
    expect(getProgressState().measurements).toHaveLength(2)

    const removedLogs = purgeLegacyServerIdWeightLogs(['server-log-uuid'])
    const removedMeasurements = purgeLegacyServerIdMeasurements(['server-measurement-uuid'])

    expect(removedLogs).toEqual([{ ...canonicalLog, id: 'server-log-uuid' }])
    expect(removedMeasurements).toEqual([{ ...canonicalMeasurement, id: 'server-measurement-uuid' }])
    expect(getProgressState().weightLogs).toEqual([canonicalLog])
    expect(getProgressState().measurements).toEqual([canonicalMeasurement])
  })

  // TEST C
  it('running the purge twice makes no further changes the second time', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    const canonicalLog = getProgressState().weightLogs[0]!
    mergeProgressFromCloud({ weightLogs: [{ ...canonicalLog, id: 'server-log-uuid' }], weightGoal: null, measurements: [] })

    purgeLegacyServerIdWeightLogs(['server-log-uuid'])
    const secondRun = purgeLegacyServerIdWeightLogs(['server-log-uuid'])

    expect(secondRun).toEqual([])
    expect(getProgressState().weightLogs).toEqual([canonicalLog])
  })

  // TEST D
  it('never removes two legitimate weight logs that merely look alike', () => {
    const logA = { id: 'weight-client-a', date: '2024-06-01', weightKg: 80 }
    const logB = { id: 'weight-client-b', date: '2024-06-01', weightKg: 80 }
    mergeProgressFromCloud({ weightLogs: [logA, logB], weightGoal: null, measurements: [] })

    const removed = purgeLegacyServerIdWeightLogs(['unrelated-server-uuid'])

    expect(removed).toEqual([])
    expect(getProgressState().weightLogs.map((l) => l.id).sort()).toEqual(['weight-client-a', 'weight-client-b'])
  })

  // TEST E
  it('never removes a local-only weight log or measurement whose id was never seen on the server', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })
    const logsBefore = getProgressState().weightLogs
    const measurementsBefore = getProgressState().measurements

    purgeLegacyServerIdWeightLogs(['a-server-uuid-that-is-not-this-record'])
    purgeLegacyServerIdMeasurements(['a-server-uuid-that-is-not-this-record'])

    expect(getProgressState().weightLogs).toBe(logsBefore)
    expect(getProgressState().measurements).toBe(measurementsBefore)
  })
})

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content (simulating an app restart) never grows weightLogs or measurements', async () => {
    vi.resetModules()
    const first = await import('./progressStore')
    first.resetProgressStoreForTests()
    first.addWeightLog({ date: '2024-06-01', weightKg: 80 })
    first.addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })
    const afterFirstOpen = {
      weightLogs: first.getProgressState().weightLogs.length,
      measurements: first.getProgressState().measurements.length,
    }

    // "Close the app": drop the in-memory module entirely. Re-importing it
    // re-runs `loadPersistedState()` at module init, exactly like a fresh
    // process reading localStorage on launch.
    vi.resetModules()
    const second = await import('./progressStore')
    expect(second.getProgressState().weightLogs).toHaveLength(afterFirstOpen.weightLogs)
    expect(second.getProgressState().measurements).toHaveLength(afterFirstOpen.measurements)

    vi.resetModules()
    const third = await import('./progressStore')
    expect(third.getProgressState().weightLogs).toHaveLength(afterFirstOpen.weightLogs)
    expect(third.getProgressState().measurements).toHaveLength(afterFirstOpen.measurements)
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
