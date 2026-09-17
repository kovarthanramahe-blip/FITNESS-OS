import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockNative(isNative: boolean) {
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative } }))
}

function mockPlugin(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  const defaults = {
    isAvailable: vi.fn().mockResolvedValue({ value: true }),
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getGrantedPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }),
    requestHealthConnectPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }),
    openSettings: vi.fn().mockResolvedValue(undefined),
    getSteps: vi.fn().mockResolvedValue({ available: true, permissionGranted: true, days: [] }),
  }
  const merged = { ...defaults, ...overrides }
  vi.doMock('./plugin', () => ({ HealthConnectPlugin: merged }))
  return merged
}

beforeEach(() => {
  vi.resetModules()
})

describe('healthConnect — availability mapping', () => {
  it('isAvailable() reflects the native plugin value when available', async () => {
    mockNative(true)
    mockPlugin({ isAvailable: vi.fn().mockResolvedValue({ value: true }) })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.isAvailable()).toBe(true)
  })

  it('isAvailable() is false when the native plugin reports unavailable', async () => {
    mockNative(true)
    mockPlugin({ isAvailable: vi.fn().mockResolvedValue({ value: false }) })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.isAvailable()).toBe(false)
  })

  it('getStatus() maps "available" through unchanged', async () => {
    mockNative(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ status: 'available' }) })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getStatus()).toBe('available')
  })

  it('getStatus() maps "unavailable" through unchanged', async () => {
    mockNative(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ status: 'unavailable' }) })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getStatus()).toBe('unavailable')
  })

  it('getStatus() maps "update_required" through unchanged', async () => {
    mockNative(true)
    mockPlugin({ getStatus: vi.fn().mockResolvedValue({ status: 'update_required' }) })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getStatus()).toBe('update_required')
  })
})

describe('healthConnect — permission state mapping', () => {
  it('reports steps and exercise granted independently', async () => {
    mockNative(true)
    mockPlugin({
      getGrantedPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS'], steps: true, exercise: false }),
    })
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getGrantedPermissions()
    expect(result).toEqual({ granted: ['READ_STEPS'], steps: true, exercise: false })
  })

  it('reports both denied when neither permission is granted', async () => {
    mockNative(true)
    mockPlugin({
      getGrantedPermissions: vi.fn().mockResolvedValue({ granted: [], steps: false, exercise: false }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getGrantedPermissions()).toEqual({ granted: [], steps: false, exercise: false })
  })

  it('requestPermissions() returns whatever the user actually granted, including a partial grant', async () => {
    mockNative(true)
    mockPlugin({
      requestHealthConnectPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS'], steps: true, exercise: false }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.requestPermissions()).toEqual({ granted: ['READ_STEPS'], steps: true, exercise: false })
  })

  it('requestPermissions() reflects a full denial without throwing', async () => {
    mockNative(true)
    mockPlugin({
      requestHealthConnectPermissions: vi.fn().mockResolvedValue({ granted: [], steps: false, exercise: false }),
    })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.requestPermissions()).resolves.toEqual({ granted: [], steps: false, exercise: false })
  })
})

describe('healthConnect — unavailable / non-native handling (app must keep working)', () => {
  it('every method resolves to a safe default on a non-native platform, without calling the native plugin', async () => {
    mockNative(false)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    expect(await healthConnect.isAvailable()).toBe(false)
    expect(await healthConnect.getStatus()).toBe('unavailable')
    expect(await healthConnect.getGrantedPermissions()).toEqual({ granted: [], steps: false, exercise: false })
    expect(await healthConnect.requestPermissions()).toEqual({ granted: [], steps: false, exercise: false })
    await expect(healthConnect.openSettings()).resolves.toBeUndefined()

    expect(plugin.isAvailable).not.toHaveBeenCalled()
    expect(plugin.getStatus).not.toHaveBeenCalled()
    expect(plugin.getGrantedPermissions).not.toHaveBeenCalled()
    expect(plugin.requestHealthConnectPermissions).not.toHaveBeenCalled()
    expect(plugin.openSettings).not.toHaveBeenCalled()
  })

  it('getGrantedPermissions() never calls the native plugin when Health Connect itself is not native-available (handled by caller pattern, direct fallback covers this)', async () => {
    mockNative(false)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    await healthConnect.getGrantedPermissions()

    expect(plugin.getGrantedPermissions).not.toHaveBeenCalled()
  })
})

describe('healthConnect — native call failure handling', () => {
  it('isAvailable() resolves false, never throws, when the native call rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ isAvailable: vi.fn().mockRejectedValue(new Error('bridge error')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.isAvailable()).resolves.toBe(false)
  })

  it('getStatus() resolves "unavailable", never throws, when the native call rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ getStatus: vi.fn().mockRejectedValue(new Error('bridge error')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.getStatus()).resolves.toBe('unavailable')
  })

  it('getGrantedPermissions() resolves to "nothing granted", never throws, when the native call rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ getGrantedPermissions: vi.fn().mockRejectedValue(new Error('bridge error')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.getGrantedPermissions()).resolves.toEqual({ granted: [], steps: false, exercise: false })
  })

  it('requestPermissions() resolves to "nothing granted", never throws, when the permission request itself fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ requestHealthConnectPermissions: vi.fn().mockRejectedValue(new Error('activity result launcher error')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.requestPermissions()).resolves.toEqual({ granted: [], steps: false, exercise: false })
  })

  it('openSettings() never throws when the native call rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ openSettings: vi.fn().mockRejectedValue(new Error('no activity to handle intent')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.openSettings()).resolves.toBeUndefined()
  })
})

describe('healthConnect — getSteps() availability/permission states', () => {
  // Scenario 1: browser/web fallback.
  it('resolves the typed unavailable response on a non-native platform, without calling the native plugin', async () => {
    mockNative(false)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-10', '2026-09-16')

    expect(result).toEqual({ available: false, permissionGranted: false, days: [], error: 'unavailable' })
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  // Scenario 2: Health Connect unavailable (on a native device, e.g. not installed).
  it('passes through a native "unavailable" result unchanged', async () => {
    mockNative(true)
    mockPlugin({
      getSteps: vi.fn().mockResolvedValue({ available: false, permissionGranted: false, days: [], error: 'unavailable' }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getSteps('2026-09-10', '2026-09-16')).toEqual({
      available: false,
      permissionGranted: false,
      days: [],
      error: 'unavailable',
    })
  })

  // Scenario 3: permission denied.
  it('passes through a native "permission_denied" result unchanged', async () => {
    mockNative(true)
    mockPlugin({
      getSteps: vi.fn().mockResolvedValue({ available: true, permissionGranted: false, days: [], error: 'permission_denied' }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getSteps('2026-09-10', '2026-09-16')).toEqual({
      available: true,
      permissionGranted: false,
      days: [],
      error: 'permission_denied',
    })
  })
})

describe('healthConnect — getSteps() invalid date ranges (validated before the native call)', () => {
  // Scenario 5: invalid start date.
  it('rejects a malformed start date without calling the native plugin', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('not-a-date', '2026-09-16')

    expect(result).toEqual({ available: false, permissionGranted: false, days: [], error: 'invalid_range' })
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  // Scenario 6: invalid end date.
  it('rejects a malformed end date without calling the native plugin', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-10', 'also-not-a-date')

    expect(result.error).toBe('invalid_range')
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  it('rejects a calendar-invalid date (Feb 30) rather than silently normalizing it', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-02-28', '2026-02-30')

    expect(result.error).toBe('invalid_range')
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })

  // Scenario 7: startDate > endDate.
  it('rejects an inverted range without calling the native plugin', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-16', '2026-09-10')

    expect(result).toEqual({ available: false, permissionGranted: false, days: [], error: 'invalid_range' })
    expect(plugin.getSteps).not.toHaveBeenCalled()
  })
})

describe('healthConnect — getSteps() failure handling', () => {
  // Scenario 4: query/read failure.
  it('passes through a native "query_failed" result unchanged', async () => {
    mockNative(true)
    mockPlugin({
      getSteps: vi.fn().mockResolvedValue({ available: true, permissionGranted: true, days: [], error: 'query_failed' }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.getSteps('2026-09-10', '2026-09-16')).toEqual({
      available: true,
      permissionGranted: true,
      days: [],
      error: 'query_failed',
    })
  })

  it('resolves "query_failed", never throws, when the native call itself rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNative(true)
    mockPlugin({ getSteps: vi.fn().mockRejectedValue(new Error('bridge error')) })
    const { healthConnect } = await import('./index')

    await expect(healthConnect.getSteps('2026-09-10', '2026-09-16')).resolves.toEqual({
      available: false,
      permissionGranted: false,
      days: [],
      error: 'query_failed',
    })
  })
})

describe('healthConnect — getSteps() date ranges', () => {
  // Scenario 8: single-day steps.
  it('reads a single day when startDate equals endDate', async () => {
    mockNative(true)
    mockPlugin({
      getSteps: vi.fn().mockResolvedValue({
        available: true,
        permissionGranted: true,
        days: [{ date: '2026-09-16', steps: 8234 }],
      }),
    })
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-16', '2026-09-16')
    expect(result.days).toEqual([{ date: '2026-09-16', steps: 8234 }])
  })

  // Scenario 9: multiple-day steps.
  it('reads multiple days across a range', async () => {
    mockNative(true)
    const days = [
      { date: '2026-09-14', steps: 5000 },
      { date: '2026-09-15', steps: 6000 },
      { date: '2026-09-16', steps: 7000 },
    ]
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ available: true, permissionGranted: true, days }) })
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-14', '2026-09-16')
    expect(result.days).toEqual(days)
  })

  // Scenario 10: zero-step day.
  it('reports zero, not an omission, for a day with no recorded steps', async () => {
    mockNative(true)
    mockPlugin({
      getSteps: vi.fn().mockResolvedValue({
        available: true,
        permissionGranted: true,
        days: [{ date: '2026-09-16', steps: 0 }],
      }),
    })
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-16', '2026-09-16')
    expect(result.days).toEqual([{ date: '2026-09-16', steps: 0 }])
  })

  // Scenario 11: inclusive start/end dates.
  it('passes the exact inclusive start/end dates through to the native call', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    await healthConnect.getSteps('2026-09-10', '2026-09-16')

    expect(plugin.getSteps).toHaveBeenCalledWith({ startDate: '2026-09-10', endDate: '2026-09-16' })
  })

  // Scenario 12: date boundary handling — the string crossing midnight is passed through untouched.
  it('does not shift a date string across a day boundary', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    await healthConnect.getSteps('2026-09-16', '2026-09-17')

    expect(plugin.getSteps).toHaveBeenCalledWith({ startDate: '2026-09-16', endDate: '2026-09-17' })
  })

  // Scenario 13: month boundary.
  it('accepts and forwards a range crossing a month boundary', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-08-30', '2026-09-02')

    expect(result.error).toBeNull()
    expect(plugin.getSteps).toHaveBeenCalledWith({ startDate: '2026-08-30', endDate: '2026-09-02' })
  })

  // Scenario 14: year boundary.
  it('accepts and forwards a range crossing a year boundary', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2025-12-30', '2026-01-02')

    expect(result.error).toBeNull()
    expect(plugin.getSteps).toHaveBeenCalledWith({ startDate: '2025-12-30', endDate: '2026-01-02' })
  })

  // Scenario 15: the exact dates 2026-09-15, 2026-09-16, 2026-09-17.
  it('reads exactly 2026-09-15 through 2026-09-17 in order', async () => {
    mockNative(true)
    const days = [
      { date: '2026-09-15', steps: 4000 },
      { date: '2026-09-16', steps: 8234 },
      { date: '2026-09-17', steps: 6100 },
    ]
    mockPlugin({ getSteps: vi.fn().mockResolvedValue({ available: true, permissionGranted: true, days }) })
    const { healthConnect } = await import('./index')

    const result = await healthConnect.getSteps('2026-09-15', '2026-09-17')
    expect(result.days).toEqual(days)
  })

  it('never converts a yyyy-mm-dd string through UTC/new Date(string) parsing (leap-year check)', async () => {
    mockNative(true)
    const plugin = mockPlugin()
    const { healthConnect } = await import('./index')

    // 2024 is a leap year (valid), 2026 is not (invalid) — `new Date("2026-02-29")`
    // would silently roll over to March 1st instead of rejecting it, so this only
    // passes if validation is done from the actual y/m/d components.
    await expect(healthConnect.getSteps('2024-02-29', '2024-02-29')).resolves.toMatchObject({ error: null })
    await expect(healthConnect.getSteps('2026-02-29', '2026-02-29')).resolves.toMatchObject({ error: 'invalid_range' })
    expect(plugin.getSteps).toHaveBeenCalledTimes(1)
    expect(plugin.getSteps).toHaveBeenCalledWith({ startDate: '2024-02-29', endDate: '2024-02-29' })
  })
})
