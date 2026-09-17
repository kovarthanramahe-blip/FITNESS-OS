import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HealthDevicesSection } from './HealthDevicesSection'
import { useHealthConnect } from '@/hooks/useHealthConnect'
import type { UseHealthConnectResult } from '@/hooks/useHealthConnect'

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

  it('tapping Sync Now calls refresh() (state-only refresh in this phase)', async () => {
    const refresh = vi.fn()
    mockedUseHealthConnect.mockReturnValue(
      hookValue({
        status: 'available',
        permissions: { granted: ['READ_STEPS', 'READ_EXERCISE'], steps: true, exercise: true },
        isConnected: true,
        refresh,
      }),
    )
    const user = userEvent.setup()
    render(<HealthDevicesSection />)

    await user.click(screen.getByRole('button', { name: 'Sync Now' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
