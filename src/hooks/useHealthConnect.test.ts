import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthConnect } from './useHealthConnect'
import { healthConnect } from '@/lib/healthConnect'
import type { HealthConnectPermissionState, HealthConnectStatus, HealthConnectStepsResult } from '@/lib/healthConnect'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'

vi.mock('@/lib/healthConnect')

const mockedHealthConnect = vi.mocked(healthConnect)

const GRANTED: HealthConnectPermissionState = { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true }
const PARTIAL: HealthConnectPermissionState = { granted: ['READ_STEPS'], steps: true, exercise: false }
const NONE: HealthConnectPermissionState = { granted: [], steps: false, exercise: false }
const NO_STEPS: HealthConnectStepsResult = { available: false, permissionGranted: false, days: [], error: null }

function mockStatus(status: HealthConnectStatus, permissions: HealthConnectPermissionState = NONE) {
  mockedHealthConnect.getStatus.mockResolvedValue(status)
  mockedHealthConnect.getGrantedPermissions.mockResolvedValue(permissions)
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedHealthConnect.openSettings.mockResolvedValue(undefined)
  mockedHealthConnect.getSteps.mockResolvedValue(NO_STEPS)
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

describe('useHealthConnect — steps (Phase 8B.1)', () => {
  // Scenario 16: hook loading state.
  it('starts with stepsLoading true and steps null before the first read resolves', () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())

    expect(result.current.stepsLoading).toBe(true)
    expect(result.current.steps).toBeNull()
  })

  // Scenario 17: hook success state.
  it('reflects a successful read once it resolves', async () => {
    mockStatus('available', GRANTED)
    const stepsResult: HealthConnectStepsResult = {
      available: true,
      permissionGranted: true,
      days: [{ date: '2026-09-16', steps: 8234 }],
      error: null,
    }
    mockedHealthConnect.getSteps.mockResolvedValue(stepsResult)

    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.stepsLoading).toBe(false))

    expect(result.current.steps).toEqual(stepsResult)
    expect(result.current.stepsError).toBeNull()
  })

  // Scenario 18: hook error state.
  it('surfaces a friendly stepsError, never a raw one, when the read itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockStatus('available', GRANTED)
    mockedHealthConnect.getSteps.mockRejectedValue(new Error('bridge disconnected'))

    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.stepsLoading).toBe(false))

    expect(result.current.stepsError).not.toBeNull()
    expect(result.current.stepsError ?? '').not.toContain('bridge disconnected')
  })

  it('reads an inclusive 7-day window ending today, on mount', async () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.stepsLoading).toBe(false))

    const today = getTodayDateString()
    expect(mockedHealthConnect.getSteps).toHaveBeenCalledWith(addDaysToDateString(today, -6), today)
  })

  it('refreshSteps() re-reads step data on demand', async () => {
    mockStatus('available', GRANTED)
    const { result } = renderHook(() => useHealthConnect())
    await waitFor(() => expect(result.current.stepsLoading).toBe(false))

    const updated: HealthConnectStepsResult = {
      available: true,
      permissionGranted: true,
      days: [{ date: getTodayDateString(), steps: 12345 }],
      error: null,
    }
    mockedHealthConnect.getSteps.mockResolvedValue(updated)

    await act(async () => {
      await result.current.refreshSteps()
    })

    expect(result.current.steps).toEqual(updated)
    expect(mockedHealthConnect.getSteps).toHaveBeenCalledTimes(2)
  })
})
