import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'

const TODAY = getTodayDateString()
const YESTERDAY = addDaysToDateString(TODAY, -1)

function mockHealthConnectModule(overrides: {
  getStatus?: ReturnType<typeof vi.fn>
  requestPermissions?: ReturnType<typeof vi.fn>
  getSteps?: ReturnType<typeof vi.fn>
  openSettings?: ReturnType<typeof vi.fn>
} = {}) {
  class HealthConnectError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  }
  const mocks = {
    getStatus: overrides.getStatus ?? vi.fn().mockResolvedValue({ connection: 'unavailable', hasHistoryPermission: false }),
    requestPermissions: overrides.requestPermissions ?? vi.fn().mockResolvedValue({ connection: 'unavailable', hasHistoryPermission: false }),
    getSteps: overrides.getSteps ?? vi.fn().mockResolvedValue([]),
    openSettings: overrides.openSettings ?? vi.fn().mockResolvedValue(undefined),
  }
  vi.doMock('@/lib/healthConnect', () => ({ ...mocks, HealthConnectError }))
  return mocks
}

/**
 * Every module with in-memory state (activityStore, storageScope) is
 * (re-)imported fresh here, in the same module-registry epoch as the
 * `useHealthConnect` import that follows — `vi.resetModules()` clears the
 * whole registry, so a module imported before it (or via a separate
 * epoch) would silently be a different instance than the one the hook
 * itself uses internally, making any store assertion read stale/empty
 * state. Call this once per test, after `mockHealthConnectModule`.
 */
async function freshStores() {
  const activityStore = await import('@/lib/activityStore')
  const storageScope = await import('@/lib/storageScope')
  storageScope.setCurrentUserId('user-health-connect-hook-test')
  activityStore.resetActivityStoreForTests()
  const { useHealthConnect } = await import('./useHealthConnect')
  return { activityStore, storageScope, useHealthConnect }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useHealthConnect — status on mount', () => {
  it('starts in "checking" before the first status check resolves', async () => {
    let resolveStatus: (value: { connection: string; hasHistoryPermission: boolean }) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveStatus = resolve
    })
    mockHealthConnectModule({ getStatus: vi.fn().mockReturnValue(pending) })
    const { useHealthConnect } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())
    expect(result.current.status).toBe('checking')

    await act(async () => {
      resolveStatus({ connection: 'unavailable', hasHistoryPermission: false })
      await pending
    })
  })

  it('reports unavailable when Health Connect is not available (Health Connect unavailable)', async () => {
    mockHealthConnectModule({ getStatus: vi.fn().mockResolvedValue({ connection: 'unavailable', hasHistoryPermission: false }) })
    const { useHealthConnect } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('reports permission-required without reading steps (permission denied / not yet granted)', async () => {
    const getSteps = vi.fn()
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'permission-required', hasHistoryPermission: false }),
      getSteps,
    })
    const { useHealthConnect } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.status).toBe('permission-required'))
    expect(getSteps).not.toHaveBeenCalled()
  })

  it("automatically reads today's/yesterday's/7-day steps once connected on mount", async () => {
    const getSteps = vi.fn().mockResolvedValue([
      { date: YESTERDAY, steps: 3500 },
      { date: TODAY, steps: 4200 },
    ])
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false }),
      getSteps,
    })
    const { useHealthConnect, activityStore } = await freshStores()

    renderHook(() => useHealthConnect())

    await waitFor(() => expect(getSteps).toHaveBeenCalledTimes(1))
    // 7-day window ending today, inclusive — never today alone.
    const [startDate, endDate] = getSteps.mock.calls[0]!
    expect(endDate).toBe(TODAY)
    expect(startDate).toBe(addDaysToDateString(TODAY, -6))

    await waitFor(() => {
      const state = activityStore.getActivityState()
      expect(state.dailySteps.find((d) => d.date === TODAY)?.steps).toBe(4200)
      expect(state.dailySteps.find((d) => d.date === YESTERDAY)?.steps).toBe(3500)
    })
  })

  it('writes imported steps with source "health-connect", and never touches ActivityEntry records (no manual + Health Connect double counting)', async () => {
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false }),
      getSteps: vi.fn().mockResolvedValue([{ date: TODAY, steps: 5000 }]),
    })
    const { useHealthConnect, activityStore } = await freshStores()
    const entriesBefore = activityStore.getActivityState().entries

    renderHook(() => useHealthConnect())

    await waitFor(() => {
      const dayEntry = activityStore.getActivityState().dailySteps.find((d) => d.date === TODAY)
      expect(dayEntry?.source).toBe('health-connect')
    })
    expect(activityStore.getActivityState().entries).toBe(entriesBefore)
  })
})

describe('useHealthConnect — connect()', () => {
  it('requests permissions and syncs steps once granted', async () => {
    const requestPermissions = vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false })
    const getSteps = vi.fn().mockResolvedValue([{ date: TODAY, steps: 6000 }])
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'permission-required', hasHistoryPermission: false }),
      requestPermissions,
      getSteps,
    })
    const { useHealthConnect, activityStore } = await freshStores()
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.status).toBe('permission-required'))

    await act(async () => {
      await result.current.connect()
    })

    expect(requestPermissions).toHaveBeenCalled()
    expect(result.current.status).toBe('connected')
    expect(activityStore.getActivityState().dailySteps.find((d) => d.date === TODAY)?.steps).toBe(6000)
  })
})

describe('useHealthConnect — refresh() replaces rather than duplicates', () => {
  it('calling refresh twice updates the same date record instead of appending a second one', async () => {
    const getSteps = vi
      .fn()
      .mockResolvedValueOnce([{ date: TODAY, steps: 1000 }])
      .mockResolvedValueOnce([{ date: TODAY, steps: 2500 }])
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false }),
      getSteps,
    })
    const { useHealthConnect, activityStore } = await freshStores()
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(activityStore.getActivityState().dailySteps.find((d) => d.date === TODAY)?.steps).toBe(1000))

    await act(async () => {
      await result.current.refresh()
    })

    const forToday = activityStore.getActivityState().dailySteps.filter((d) => d.date === TODAY)
    expect(forToday).toHaveLength(1)
    expect(forToday[0]?.steps).toBe(2500)
  })
})

describe('useHealthConnect — read failures never silently show zero', () => {
  it('a permission-denied/read failure sets stepsError and leaves existing store data untouched', async () => {
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false }),
      getSteps: vi.fn().mockRejectedValue(Object.assign(new Error('Unable to read Health Connect step data.'), { code: 'READ_FAILED' })),
    })
    const { useHealthConnect, activityStore } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.stepsError).toBeTruthy())
    // Never written as a fabricated 0 — no record exists for today at all, distinct from a real zero-step day.
    expect(activityStore.getActivityState().dailySteps.find((d) => d.date === TODAY)).toBeUndefined()
  })

  it('a status check failure reports unavailable with a surfaced error message, not a silent hang', async () => {
    mockHealthConnectModule({ getStatus: vi.fn().mockRejectedValue(new Error('boom')) })
    const { useHealthConnect } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.error).toBeTruthy()
  })

  it('missing historical data resolves as an empty list without error, and writes nothing new', async () => {
    mockHealthConnectModule({
      getStatus: vi.fn().mockResolvedValue({ connection: 'connected', hasHistoryPermission: false }),
      getSteps: vi.fn().mockResolvedValue([]),
    })
    const { useHealthConnect, activityStore } = await freshStores()

    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.status).toBe('connected'))
    expect(result.current.stepsError).toBeNull()
    expect(activityStore.getActivityState().dailySteps).toEqual([])
  })
})

describe('useHealthConnect — openSettings', () => {
  it('delegates to the healthConnect module', async () => {
    const openSettings = vi.fn().mockResolvedValue(undefined)
    mockHealthConnectModule({ openSettings })
    const { useHealthConnect } = await freshStores()
    const { result } = renderHook(() => useHealthConnect())

    await act(async () => {
      await result.current.openSettings()
    })

    expect(openSettings).toHaveBeenCalled()
  })
})
