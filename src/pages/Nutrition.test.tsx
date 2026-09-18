import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Nutrition } from './Nutrition'
import { addWaterLog, getHabitState, resetHabitStoreForTests } from '@/lib/habitStore'
import { resetNutritionStoreForTests } from '@/lib/nutritionStore'
import { resetProgressStoreForTests } from '@/lib/progressStore'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { getDailyWaterMl } from '@/utils/habits'

const TODAY = getTodayDateString()
const YESTERDAY = addDaysToDateString(TODAY, -1)

// A signed-in, un-seeded slate — the default (unauthenticated) store carries
// demo water logs for recent relative dates, which would otherwise add to
// these exact-ml assertions.
beforeEach(() => {
  setCurrentUserId('user-nutrition-water-regression')
  resetHabitStoreForTests()
  resetNutritionStoreForTests()
  resetProgressStoreForTests()
})

afterEach(() => {
  resetStorageScopeForTests()
  resetHabitStoreForTests()
})

/**
 * Regression coverage for the water date-isolation bug: WaterTracker used to
 * ignore Nutrition's DateNavigator entirely and always read/write "today",
 * so browsing to yesterday still showed and edited today's water — the
 * user-visible version of "changing today's water changes yesterday's
 * displayed value" (yesterday's own value was never actually shown or
 * editable at all).
 */
describe('Nutrition page — water respects the selected date', () => {
  it('shows yesterday\'s own water total when navigating to yesterday, not today\'s', async () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    const user = userEvent.setup()
    render(<Nutrition />)

    // Starts on today. (mlToLiters rounds to 1 decimal but drops a trailing
    // zero, so 4000 ml renders as "4 L", not "4.0 L".)
    expect(screen.getByTestId('water-total')).toHaveTextContent('4 L')

    await user.click(screen.getByRole('button', { name: 'Previous day' }))

    // Now on yesterday — must show yesterday's own total, not today's.
    expect(screen.getByTestId('water-total')).toHaveTextContent('3.5 L')
  })

  it('adding water while viewing yesterday logs it to yesterday, never to today', async () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    const user = userEvent.setup()
    render(<Nutrition />)

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    await user.click(screen.getByRole('button', { name: '250 ml' }))

    expect(getDailyWaterMl(getHabitState().waterLogs, YESTERDAY)).toBe(3750)
    expect(getDailyWaterMl(getHabitState().waterLogs, TODAY)).toBe(4000)
  })

  it('adding water while viewing today never changes yesterday', async () => {
    addWaterLog(3500, YESTERDAY)
    addWaterLog(4000, TODAY)
    const user = userEvent.setup()
    render(<Nutrition />)

    await user.click(screen.getByRole('button', { name: '250 ml' }))

    expect(getDailyWaterMl(getHabitState().waterLogs, TODAY)).toBe(4250)
    expect(getDailyWaterMl(getHabitState().waterLogs, YESTERDAY)).toBe(3500)
  })
})
