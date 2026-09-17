import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthConnect } from './useHealthConnect'
import { healthConnect } from '@/lib/healthConnect'
import type { HealthConnectPermissionState, HealthConnectStatus } from '@/lib/healthConnect'

vi.mock('@/lib/healthConnect')

const mockedHealthConnect = vi.mocked(healthConnect)

const GRANTED: HealthConnectPermissionState = { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }
const PARTIAL: HealthConnectPermissionState = { granted: ['READ_STEPS'], steps: true, exercise: false }
const NONE: HealthConnectPermissionState = { granted: [], steps: false, exercise: false }

function mockStatus(status: HealthConnectStatus, permissions: HealthConnectPermissionState = NONE) {
  mockedHealthConnect.getStatus.mockResolvedValue(status)
  mockedHealthConnect.getGrantedPermissions.mockResolvedValue(permissions)
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedHealthConnect.openSettings.mockResolvedValue(undefined)
})

describe('useHealthConnect — initial load', () => {
  it('starts with status null and loading true before the first check resolves', () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())

    expect(result.current.status).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('reflects "unavailable" and never fetches permissions when Health Connect is not available', async () => {
    mockStatus('unavailable')
    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status).toBe('unavailable')
    expect(result.current.permissions).toEqual(NONE)
    expect(result.current.isConnected).toBe(false)
    expect(mockedHealthConnect.getGrantedPermissions).not.toHaveBeenCalled()
  })

  it('reflects "update_required" without fetching permissions', async () => {
    mockStatus('update_required')
    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status).toBe('update_required')
    expect(result.current.isConnected).toBe(false)
    expect(mockedHealthConnect.getGrantedPermissions).not.toHaveBeenCalled()
  })

  it('is connected once available and both steps + exercise permissions are granted', async () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status).toBe('available')
    expect(result.current.permissions).toEqual(GRANTED)
    expect(result.current.isConnected).toBe(true)
  })

  it('is not connected when available but only a partial grant exists', async () => {
    mockStatus('available', PARTIAL)
    const { result } = renderHook(() => useHealthConnect())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isConnected).toBe(false)
    expect(result.current.permissions).toEqual(PARTIAL)
  })
})

describe('useHealthConnect — connect()', () => {
  it('granting both permissions makes the hook report connected', async () => {
    mockStatus('available', NONE)
    mockedHealthConnect.requestPermissions.mockResolvedValue(GRANTED)

    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isConnected).toBe(false)

    await act(async () => {
      await result.current.connect()
    })

    expect(mockedHealthConnect.requestPermissions).toHaveBeenCalledTimes(1)
    expect(result.current.permissions).toEqual(GRANTED)
    expect(result.current.isConnected).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('denying the permission request leaves the app usable and unconnected, with no error thrown', async () => {
    mockStatus('available', NONE)
    mockedHealthConnect.requestPermissions.mockResolvedValue(NONE)

    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a friendly error when the permission request itself fails, without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockStatus('available', NONE)
    mockedHealthConnect.requestPermissions.mockRejectedValue(new Error('activity result launcher error'))

    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.connect()
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.loading).toBe(false)
  })
})

describe('useHealthConnect — refresh() ("Sync Now")', () => {
  it('re-checks status and permissions, picking up a permission revoked outside the app', async () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isConnected).toBe(true)

    mockedHealthConnect.getGrantedPermissions.mockResolvedValue(NONE)
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.permissions).toEqual(NONE)
  })

  it('surfaces a friendly error, never a raw one, when the status check fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockedHealthConnect.getStatus.mockRejectedValue(new Error('bridge disconnected'))
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error ?? '').not.toContain('bridge disconnected')
  })
})

describe('useHealthConnect — openSettings()', () => {
  it('delegates to healthConnect.openSettings without throwing', async () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.openSettings()
    })

    expect(mockedHealthConnect.openSettings).toHaveBeenCalledTimes(1)
  })
})
