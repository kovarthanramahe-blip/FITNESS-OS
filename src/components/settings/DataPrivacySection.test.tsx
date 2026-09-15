import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataPrivacySection } from './DataPrivacySection'
import { useToast } from '@/hooks/useToast'
import { addWeightLog, getProgressState, resetProgressStoreForTests } from '@/lib/progressStore'
import { addHabit, getHabitState, resetHabitStoreForTests } from '@/lib/habitStore'
import { resetGamificationStoreForTests } from '@/lib/gamificationStore'
import { resetNutritionStoreForTests } from '@/lib/nutritionStore'
import { resetWorkoutStoreForTests } from '@/lib/workoutStore'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'

vi.mock('@/hooks/useToast')
const mockedUseToast = vi.mocked(useToast)

beforeEach(() => {
  setCurrentUserId('user-data-privacy-test')
  resetWorkoutStoreForTests()
  resetProgressStoreForTests()
  resetNutritionStoreForTests()
  resetHabitStoreForTests()
  resetGamificationStoreForTests()
  mockedUseToast.mockReturnValue({ showToast: vi.fn() })
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
})
