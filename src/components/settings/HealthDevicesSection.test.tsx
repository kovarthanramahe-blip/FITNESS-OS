import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HealthDevicesSection } from './HealthDevicesSection'
import { useHealthConnect } from '@/hooks/useHealthConnect'
import type { UseHealthConnectResult } from '@/hooks/useHealthConnect'
import type { HealthConnectPermissionState } from '@/lib/healthConnect'

vi.mock('@/hooks/useHealthConnect')

const mockedUseHealthConnect = vi.mocked(useHealthConnect)

function hookValue(overrides: Partial<UseHealthConnectResult> = {}): UseHealthConnectResult {
  return {
    status: null,
    permissions: { granted: [], steps: false, exercise: false },
    loading: false,
    error: null,
    isConnected: false,
    connect: vi.fn(),
    refresh: vi.fn(),
    openSettings: vi.fn(),
    steps: null,
    stepsLoading: false,
    stepsError: null,
    refreshSteps: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('HealthDevicesSection — states', () => {
  it('shows a loading state while the initial check is in flight', () => {
    mockedUseHealthConnect.mockReturnValue(hookValue({ status: null, loading: true }))
    render(<HealthDevicesSection />)

    expect(screen.getByText('Checking availability…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Grant Access' })).not.toBeInTheDocument()
  })

  it('NOT AVAILABLE: reports Health Connect is not available and offers no actions', () => {
    mockedUseHealthConnect.mockReturnValue(hookValue({ status: 'unavailable' }))
    render(<HealthDevicesSection />)

    expect(screen.getByText('Not available on this device.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Grant Access' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage Permissions' })).not.toBeInTheDocument()
    expect(screen.queryByText('Steps')).not.toBeInTheDocument()
  })

  it('permission-denied: available but not connected shows Grant Access and both permission rows as not granted', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: [], steps: false, exercise: false },
        isConnected: false,
      }),
    )
    render(<HealthDevicesSection />)

    expect(screen.getByText('Permission not granted.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grant Access' })).toBeInTheDocument()
    expect(screen.getAllByText('Permission not granted')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Manage Permissions' })).not.toBeInTheDocument()
  })

  it('CONNECTED: shows Connected with both permission rows granted and Manage Permissions / Sync Now actions', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true },
        isConnected: true,
      }),
    )
    render(<HealthDevicesSection />)

    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Permission granted')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Manage Permissions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Grant Access' })).not.toBeInTheDocument()
  })

  it('update_required: prompts to open Health Connect instead of Grant Access', () => {
    mockedUseHealthConnect.mockReturnValue(hookValue({ status: 'update_required' }))
    render(<HealthDevicesSection />)

    expect(screen.getByText('Needs an update before Fitness OS can connect.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Health Connect' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Grant Access' })).not.toBeInTheDocument()
  })

  it('surfaces an error message without hiding the rest of the section', () => {
    mockedUseHealthConnect.mockReturnValue(hookValue({ status: 'available', error: 'We couldn’t check Health Connect right now. Please try again.' }))
    render(<HealthDevicesSection />)

    expect(screen.getByText('We couldn’t check Health Connect right now. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Health & Devices')).toBeInTheDocument()
  })
})

describe('HealthDevicesSection — actions', () => {
  it('tapping Grant Access calls connect()', async () => {
    const connect = vi.fn()
    mockedUseHealthConnect.mockReturnValue(
      hookValue({ status: 'available', permissions: { granted: [], steps: false, exercise: false }, isConnected: false, connect }),
    )
    const user = userEvent.setup()
    render(<HealthDevicesSection />)

    await user.click(screen.getByRole('button', { name: 'Grant Access' }))
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it('tapping Manage Permissions calls openSettings()', async () => {
    const openSettings = vi.fn()
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true },
        isConnected: true,
        openSettings,
      }),
    )
    const user = userEvent.setup()
    render(<HealthDevicesSection />)

    await user.click(screen.getByRole('button', { name: 'Manage Permissions' }))
    expect(openSettings).toHaveBeenCalledTimes(1)
  })

  it('tapping Sync Now calls refresh() and refreshSteps()', async () => {
    const refresh = vi.fn()
    const refreshSteps = vi.fn()
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true },
        isConnected: true,
        refresh,
        refreshSteps,
      }),
    )
    const user = userEvent.setup()
    render(<HealthDevicesSection />)

    await user.click(screen.getByRole('button', { name: 'Sync Now' }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refreshSteps).toHaveBeenCalledTimes(1)
  })
})

describe('HealthDevicesSection — steps (Phase 8B.1)', () => {
  const CONNECTED_BASE = {
    status: 'available' as const,
    permissions: { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true } as HealthConnectPermissionState,
    isConnected: true,
  }

  it('shows a loading placeholder for steps before the first read resolves', () => {
    mockedUseHealthConnect.mockReturnValue(hookValue({ ...CONNECTED_BASE, steps: null, stepsLoading: true }))
    render(<HealthDevicesSection />)

    expect(screen.getByText("Today's Steps")).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows real today/7-day step data once loaded', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        ...CONNECTED_BASE,
        stepsLoading: false,
        steps: {
          available: true,
          permissionGranted: true,
          error: null,
          days: [
            { date: '2026-09-15', steps: 4000 },
            { date: '2026-09-16', steps: 12345 },
          ],
        },
      }),
    )
    render(<HealthDevicesSection />)

    expect(screen.getByText('Last 7 Days')).toBeInTheDocument()
    expect(screen.getByText('4,000')).toBeInTheDocument()
    expect(screen.getByText('12,345')).toBeInTheDocument()
  })

  it('shows 0 for today when today has no entry in the read result yet', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        ...CONNECTED_BASE,
        stepsLoading: false,
        steps: { available: true, permissionGranted: true, error: null, days: [{ date: '2020-01-01', steps: 999 }] },
      }),
    )
    render(<HealthDevicesSection />)

    const todayStepsHeading = screen.getByText("Today's Steps")
    expect(todayStepsHeading.nextElementSibling).toHaveTextContent('0')
  })

  it('surfaces a friendly stepsError without hiding the rest of the section', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({ ...CONNECTED_BASE, stepsError: 'We couldn’t read step data right now. Please try again.' }),
    )
    render(<HealthDevicesSection />)

    expect(screen.getByText('We couldn’t read step data right now. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Health & Devices')).toBeInTheDocument()
  })

  it('does not show step data when not connected', () => {
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: [], steps: false, exercise: false },
        isConnected: false,
        steps: { available: true, permissionGranted: true, error: null, days: [{ date: '2026-09-16', steps: 500 }] },
      }),
    )
    render(<HealthDevicesSection />)

    expect(screen.queryByText("Today's Steps")).not.toBeInTheDocument()
    expect(screen.queryByText('Last 7 Days')).not.toBeInTheDocument()
  })
})
