import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataPrivacySection } from './DataPrivacySection'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { addWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
import { addHabit, getHabitState, resetHabitStoreForTests } from '@/lib/habitStore'
import { resetGamificationStoreForTests } from '@/lib/gamificationStore'
import { resetNutritionStoreForTests } from '@/lib/nutritionStore'
import { resetWorkoutStoreForTests } from '@/lib/workoutStore'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import type { AuthContextValue } from '@/lib/authContext'

vi.mock('@/hooks/useToast')
vi.mock('@/hooks/useAuth')
const mockedUseToast = vi.mocked(useToast)
const mockedUseAuth = vi.mocked(useAuth)

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    isAuthenticated: false,
    isSupabaseConfigured: false,
    error: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  setCurrentUserId('user-data-privacy-test')
  resetWorkoutStoreForTests()
  resetProgressStoreForTests()
  resetNutritionStoreForTests()
  resetHabitStoreForTests()
  resetGamificationStoreForTests()
  mockedUseToast.mockReturnValue({ showToast: vi.fn() })
  mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true, isSupabaseConfigured: true }))
})

afterEach(() => {
  resetStorageScopeForTests()
})

describe('DataPrivacySection', () => {
  it('does not reset anything until the confirmation dialog is accepted', async () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })

    const user = userEvent.setup()
    render(<DataPrivacySection />)
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByText('Reset Fitness Data?')).toBeInTheDocument()
    expect(getProgressState().weightLogs).toHaveLength(1)
  })

  it('cancelling the dialog leaves data untouched', async () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })

    const user = userEvent.setup()
    render(<DataPrivacySection />)
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(getProgressState().weightLogs).toHaveLength(1)
  })

  it('clears all fitness data once the reset is confirmed', async () => {
    addWeightLog({ date: '2024-06-01', weightKg: 80 })
    addHabit({
      name: 'Drink water',
      icon: 'droplets',
      category: 'hydration',
      frequency: { type: 'daily' },
      target: 1,
      reminderEnabled: false,
      active: true,
    })
    const showToast = vi.fn()
    mockedUseToast.mockReturnValue({ showToast })

    const user = userEvent.setup()
    render(<DataPrivacySection />)
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Yes, reset my data' }))

    expect(getProgressState().weightLogs).toEqual([])
    expect(getHabitState().habits).toEqual([])
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Fitness data reset' }))
  })

  it('tells a signed-in cloud-sync user that the reset also clears their data in the cloud, on every device', async () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true, isSupabaseConfigured: true }))

    const user = userEvent.setup()
    render(<DataPrivacySection />)

    expect(screen.getAllByText(/in the cloud, across all your devices/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getAllByText(/in the cloud, across all your devices/).length).toBeGreaterThan(0)
    expect(screen.getByText(/signing in elsewhere afterward will also show zero/)).toBeInTheDocument()
  })

  it('never mentions the cloud for a guest/local-only session', async () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: false, isSupabaseConfigured: false }))

    const user = userEvent.setup()
    render(<DataPrivacySection />)

    expect(screen.queryByText(/cloud/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.queryByText(/cloud/i)).not.toBeInTheDocument()
  })

  it('the success toast reflects cloud scope when signed in with cloud sync active', async () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true, isSupabaseConfigured: true }))
    const showToast = vi.fn()
    mockedUseToast.mockReturnValue({ showToast })

    const user = userEvent.setup()
    render(<DataPrivacySection />)
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Yes, reset my data' }))

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('in the cloud, across all your devices') }),
    )
  })
})
