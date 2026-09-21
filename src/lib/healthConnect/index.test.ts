import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function mockCapacitor(isNative: boolean) {
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative } }))
}

function mockPlugin(overrides: {
  isAvailable?: ReturnType<typeof vi.fn>
  getStatus?: ReturnType<typeof vi.fn>
  requestHealthConnectPermissions?: ReturnType<typeof vi.fn>
  getSteps?: ReturnType<typeof vi.fn>
  openSettings?: ReturnType<typeof vi.fn>
} = {}) {
  const HealthConnect = {
    isAvailable: overrides.isAvailable ?? vi.fn().mockResolvedValue({ available: true }),
    getStatus: overrides.getStatus ?? vi.fn().mockResolvedValue({ available: true, hasStepsPermission: true, hasHistoryPermission: false }),
    requestHealthConnectPermissions:
      overrides.requestHealthConnectPermissions ??
      vi.fn().mockResolvedValue({ available: true, hasStepsPermission: true, hasHistoryPermission: false }),
    getSteps: overrides.getSteps ?? vi.fn().mockResolvedValue({ results: [] }),
    openSettings: overrides.openSettings ?? vi.fn().mockResolvedValue(undefined),
  }
  vi.doMock('@/lib/healthConnect/plugin', () => ({ HealthConnect }))
  return HealthConnect
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isAvailable', () => {
  it('is always false on web/non-native, without calling the native plugin', async () => {
    mockCapacitor(false)
    const plugin = mockPlugin()
    const { isAvailable } = await import('./index')

    expect(await isAvailable()).toBe(false)
    expect(plugin.isAvailable).not.toHaveBeenCalled()
  })

  it('reflects the native plugin result when native', async () => {
    mockCapacitor(true)
    mockPlugin({ isAvailable: vi.fn().mockResolvedValue({ available: true }) })
    const { isAvailable } = await import('./index')

    expect(await isAvailable()).toBe(true)
  })

  it('reports unavailable (never throws) if the native call itself fails', async () => {
    mockCapacitor(true)
    mockPlugin({ isAvailable: vi.fn().mockRejectedValue(new Error('boom')) })
    const { isAvailable } = await import('./index')

    await expect(isAvailable()).resolves.toBe(false)
  })
})

describe('getStatus — permission state', () => {
  it('reports unavailable on web without calling the native plugin', async () => {
    mockCapacitor(false)
    const plugin = mockPlugin()
    const { getStatus } = await import('./index')

    expect(await getStatus()).toEqual({ connection: 'unavailable', hasHistoryPermission: false })
    expect(plugin.getStatus).not.toHaveBeenCalled()
  })

  it('reports permission-required when Health Connect is installed but steps permission is not granted', async () => {
    mockCapacitor(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ available: true, hasStepsPermission: false, hasHistoryPermission: false }) })
    const { getStatus } = await import('./index')

    expect(await getStatus()).toEqual({ connection: 'permission-required', hasHistoryPermission: false })
  })

  it('reports connected with history permission surfaced separately when both are granted', async () => {
    mockCapacitor(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ available: true, hasStepsPermission: true, hasHistoryPermission: true }) })
    const { getStatus } = await import('./index')

    expect(await getStatus()).toEqual({ connection: 'connected', hasHistoryPermission: true })
  })

  it('reports unavailable when Health Connect itself is not installed', async () => {
    mockCapacitor(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ available: false, hasStepsPermission: false, hasHistoryPermission: false }) })
    const { getStatus } = await import('./index')

    expect(await getStatus()).toEqual({ connection: 'unavailable', hasHistoryPermission: false })
  })

  it('never throws — a native failure reports unavailable', async () => {
    mockCapacitor(true)
    mockPlugin({ getStatus: vi.fn().mockRejectedValue(new Error('boom')) })
    const { getStatus } = await import('./index')

    await expect(getStatus()).resolves.toEqual({ connection: 'unavailable', hasHistoryPermission: false })
  })
})

describe('requestPermissions — permission request', () => {
  it('is a no-op reporting unavailable on web', async () => {
    mockCapacitor(false)
    const plugin = mockPlugin()
    const { requestPermissions } = await import('./index')

    expect(await requestPermissions()).toEqual({ connection: 'unavailable', hasHistoryPermission: false })
    expect(plugin.requestHealthConnectPermissions).not.toHaveBeenCalled()
  })

  it('resolves connected when the user grants steps permission', async () => {
    mockCapacitor(true)
    mockPlugin({
      requestHealthConnectPermissions: vi.fn().mockResolvedValue({ available: true, hasStepsPermission: true, hasHistoryPermission: false }),
    })
    const { requestPermissions } = await import('./index')

    expect(await requestPermissions()).toEqual({ connection: 'connected', hasHistoryPermission: false })
  })

  it('resolves permission-required (not an error) when the user dismisses without granting', async () => {
    mockCapacitor(true)
    mockPlugin({
      requestHealthConnectPermissions: vi.fn().mockResolvedValue({ available: true, hasStepsPermission: false, hasHistoryPermission: false }),
    })
    const { requestPermissions } = await import('./index')

    await expect(requestPermissions()).resolves.toEqual({ connection: 'permission-required', hasHistoryPermission: false })
  })

  it('throws a HealthConnectError for a genuine native failure', async () => {
    mockCapacitor(true)
    mockPlugin({
      requestHealthConnectPermissions: vi.fn().mockRejectedValue(Object.assign(new Error('native crash'), { code: 'UNKNOWN' })),
    })
    const { requestPermissions, HealthConnectError } = await import('./index')

    await expect(requestPermissions()).rejects.toBeInstanceOf(HealthConnectError)
  })
})

describe('getSteps — today, yesterday, and 7-day history all flow through the same date-range call', () => {
  it('throws UNAVAILABLE on web without calling the native plugin', async () => {
    mockCapacitor(false)
    const plugin = mockPlugin()
    const { getSteps, HealthConnectError } = await import('./index')

    await expect(getSteps('2026-09-14', '2026-09-20')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(getSteps('2026-09-14', '2026-09-20')).rejects.toBeInstanceOf(HealthConnectError)
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  it('returns one entry per requested day, never combined into a single total (7-day history)', async () => {
    mockCapacitor(true)
    const results = [
      { date: '2026-09-14', steps: 8000 },
      { date: '2026-09-15', steps: 9000 },
      { date: '2026-09-16', steps: 0 },
      { date: '2026-09-17', steps: 10234 },
      { date: '2026-09-18', steps: 5000 },
      { date: '2026-09-19', steps: 7000 },
      { date: '2026-09-20', steps: 6000 },
    ]
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ results }) })
    const { getSteps } = await import('./index')

    const daily = await getSteps('2026-09-14', '2026-09-20')

    expect(daily).toEqual(results)
    expect(daily).toHaveLength(7)
  })

  it("today's steps: a single-day request returns exactly that day's own entry", async () => {
    mockCapacitor(true)
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ results: [{ date: '2026-09-20', steps: 4321 }] }) })
    const { getSteps } = await import('./index')

    expect(await getSteps('2026-09-20', '2026-09-20')).toEqual([{ date: '2026-09-20', steps: 4321 }])
  })

  it("yesterday's steps: passes yesterday's own date through to the native call", async () => {
    mockCapacitor(true)
    const nativeGetSteps = vi.fn().mockResolvedValue({ results: [{ date: '2026-09-19', steps: 1500 }] })
    mockPlugin({ getSteps: nativeGetSteps })
    const { getSteps } = await import('./index')

    await getSteps('2026-09-19', '2026-09-19')

    expect(nativeGetSteps).toHaveBeenCalledWith({ startDate: '2026-09-19', endDate: '2026-09-19' })
  })

  it('a zero-step day is a legitimate value, passed through as-is (not an error)', async () => {
    mockCapacitor(true)
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ results: [{ date: '2026-09-20', steps: 0 }] }) })
    const { getSteps } = await import('./index')

    await expect(getSteps('2026-09-20', '2026-09-20')).resolves.toEqual([{ date: '2026-09-20', steps: 0 }])
  })

  it('validates local-date-only strings before ever reaching the native side (rejects UTC/invalid formats)', async () => {
    mockCapacitor(true)
    const plugin = mockPlugin()
    const { getSteps, HealthConnectError } = await import('./index')

    await expect(getSteps('2026-09-20T00:00:00.000Z', '2026-09-20')).rejects.toMatchObject({ code: 'INVALID_DATE' })
    await expect(getSteps('not-a-date', '2026-09-20')).rejects.toBeInstanceOf(HealthConnectError)
    await expect(getSteps('2026-13-40', '2026-09-20')).rejects.toMatchObject({ code: 'INVALID_DATE' })
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  it('rejects an inverted range (endDate before startDate) before reaching the native side', async () => {
    mockCapacitor(true)
    const plugin = mockPlugin()
    const { getSteps } = await import('./index')

    await expect(getSteps('2026-09-20', '2026-09-14')).rejects.toMatchObject({ code: 'INVALID_RANGE' })
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  it('accepts local calendar-day boundaries exactly as given, never shifting via UTC conversion', async () => {
    mockCapacitor(true)
    const nativeGetSteps = vi.fn().mockResolvedValue({ results: [] })
    mockPlugin({ getSteps: nativeGetSteps })
    const { getSteps } = await import('./index')

    // A leap-year boundary and a DST-adjacent date, passed through verbatim.
    await getSteps('2024-02-29', '2024-03-01')
    expect(nativeGetSteps).toHaveBeenCalledWith({ startDate: '2024-02-29', endDate: '2024-03-01' })
  })

  it('permission denied surfaces as a typed error, not an empty/zero result', async () => {
    mockCapacitor(true)
    mockPlugin({
      getSteps: vi.fn().mockRejectedValue(Object.assign(new Error('READ_STEPS permission has not been granted'), { code: 'PERMISSION_DENIED' })),
    })
    const { getSteps, HealthConnectError } = await import('./index')

    await expect(getSteps('2026-09-20', '2026-09-20')).rejects.toBeInstanceOf(HealthConnectError)
    await expect(getSteps('2026-09-20', '2026-09-20')).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
  })

  it('a native read failure surfaces as READ_FAILED, distinct from permission-denied or a zero result', async () => {
    mockCapacitor(true)
    mockPlugin({ getSteps: vi.fn().mockRejectedValue(Object.assign(new Error('aggregate() threw'), { code: 'READ_FAILED' })) })
    const { getSteps } = await import('./index')

    await expect(getSteps('2026-09-20', '2026-09-20')).rejects.toMatchObject({ code: 'READ_FAILED' })
  })

  it('missing historical data before the requested range is not fabricated — an empty native result stays empty', async () => {
    mockCapacitor(true)
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ results: [] }) })
    const { getSteps } = await import('./index')

    await expect(getSteps('2020-01-01', '2020-01-07')).resolves.toEqual([])
  })

  it('never re-sums or re-aggregates results client-side — passes the native aggregate straight through', async () => {
    mockCapacitor(true)
    // Deliberately includes an entry with a very large value that a manual
    // re-sum bug would double- or mis-count; the wrapper must not touch it.
    const results = [{ date: '2026-09-20', steps: 20000 }]
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ results }) })
    const { getSteps } = await import('./index')

    const daily = await getSteps('2026-09-20', '2026-09-20')
    expect(daily).toEqual(results)
  })
})

describe('openSettings', () => {
  it('is a no-op on web', async () => {
    mockCapacitor(false)
    const plugin = mockPlugin()
    const { openSettings } = await import('./index')

    await openSettings()
    expect(plugin.openSettings).not.toHaveBeenCalled()
  })

  it('calls the native plugin when native', async () => {
    mockCapacitor(true)
    const plugin = mockPlugin()
    const { openSettings } = await import('./index')

    await openSettings()
    expect(plugin.openSettings).toHaveBeenCalled()
  })

  it('never throws even if the native call fails', async () => {
    mockCapacitor(true)
    mockPlugin({ openSettings: vi.fn().mockRejectedValue(new Error('boom')) })
    const { openSettings } = await import('./index')

    await expect(openSettings()).resolves.toBeUndefined()
  })
})
