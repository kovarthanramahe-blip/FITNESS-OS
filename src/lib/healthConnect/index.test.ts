import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockNative(isNative: boolean) {
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative } }))
}

function mockPlugin(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  const defaults = {
    isAvailable: vi.fn().mockResolvedValue({ value: true }),
    getStatus: vi.fn().mockResolvedValue({ status: 'available' }),
    getGrantedPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }),
    requestPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }),
    openSettings: vi.fn().mockResolvedValue(undefined),
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
      requestPermissions: vi.fn().mockResolvedValue({ granted: ['READ_STEPS'], steps: true, exercise: false }),
    })
    const { healthConnect } = await import('./index')

    expect(await healthConnect.requestPermissions()).toEqual({ granted: ['READ_STEPS'], steps: true, exercise: false })
  })

  it('requestPermissions() reflects a full denial without throwing', async () => {
    mockNative(true)
    mockPlugin({
      requestPermissions: vi.fn().mockResolvedValue({ granted: [], steps: false, exercise: false }),
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
    expect(plugin.requestPermissions).not.toHaveBeenCalled()
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
    mockPlugin({ requestPermissions: vi.fn().mockRejectedValue(new Error('activity result launcher error')) })
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
