import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressCalendarCard } from './ProgressCalendarCard'
import { useHabitStore } from '@/lib/habitStore'
import type { HabitStoreState } from '@/lib/habitStore'
import { useProgressCalendar } from '@/hooks/useProgressCalendar'
import type { UseProgressCalendarResult } from '@/hooks/useProgressCalendar'
import type { CalendarDayActivity, CalendarGridDay } from '@/utils/progressCalendar'
import { getCalendarMonthGrid } from '@/utils/progressCalendar'

vi.mock('@/hooks/useProgressCalendar')
vi.mock('@/lib/habitStore')

const mockedUseProgressCalendar = vi.mocked(useProgressCalendar)
const mockedUseHabitStore = vi.mocked(useHabitStore)

const NO_ACTIVITY: CalendarDayActivity = {
  date: '',
  workout: false,
  weightKg: null,
  nutrition: null,
  waterMl: null,
  habits: null,
  hasActivity: false,
}

function makeGrid(): CalendarGridDay[] {
  return getCalendarMonthGrid(2026, 8) // September 2026
}

function makeHookValue(overrides: Partial<UseProgressCalendarResult> = {}): UseProgressCalendarResult {
  const grid = makeGrid()
  return {
    year: 2026,
    month: 8,
    monthLabel: 'September 2026',
    grid,
    today: '2026-09-16',
    goToPreviousMonth: vi.fn(),
    goToNextMonth: vi.fn(),
    getActivity: (date: string) => ({ ...NO_ACTIVITY, date }),
    ...overrides,
  }
}

beforeEach(() => {
  mockedUseProgressCalendar.mockReturnValue(makeHookValue())
  mockedUseHabitStore.mockReturnValue({
    habits: [],
    entries: [],
    waterLogs: [],
    waterGoal: { goalMl: 2500, preferredUnit: 'l' },
  } satisfies HabitStoreState)
})

describe('ProgressCalendarCard — structure', () => {
  it('shows the card title, weekday headers and the visible month label', () => {
    render(<ProgressCalendarCard />)

    expect(screen.getByRole('heading', { name: 'Progress Calendar' })).toBeInTheDocument()
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('marks September 16, 2026 as today, distinctly from other days', () => {
    render(<ProgressCalendarCard />)

    expect(screen.getByRole('button', { name: /^Today, Wednesday, September 16, 2026/ })).toBeInTheDocument()
  })

  it('calls goToPreviousMonth / goToNextMonth from their respective buttons', async () => {
    const goToPreviousMonth = vi.fn()
    const goToNextMonth = vi.fn()
    mockedUseProgressCalendar.mockReturnValue(makeHookValue({ goToPreviousMonth, goToNextMonth }))
    const user = userEvent.setup()
    render(<ProgressCalendarCard />)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))

    expect(goToPreviousMonth).toHaveBeenCalledTimes(1)
    expect(goToNextMonth).toHaveBeenCalledTimes(1)
  })
})

describe('ProgressCalendarCard — day detail', () => {
  it('shows "No progress recorded for this day." when nothing happened that day', async () => {
    const user = userEvent.setup()
    render(<ProgressCalendarCard />)

    await user.click(screen.getByRole('button', { name: /^Today,/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('No progress recorded for this day.')).toBeInTheDocument()
  })

  it('shows only the activity that actually exists for that day, in the exact values provided', async () => {
    mockedUseProgressCalendar.mockReturnValue(
      makeHookValue({
        getActivity: (date: string) => ({
          date,
          workout: true,
          weightKg: 78.4,
          nutrition: { calories: 2140, protein: 142 },
          waterMl: 2800,
          habits: { completed: 4, scheduled: 5 },
          hasActivity: true,
        }),
      }),
    )
    const user = userEvent.setup()
    render(<ProgressCalendarCard />)

    await user.click(screen.getByRole('button', { name: /^Today,/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Completed')
    expect(dialog).toHaveTextContent('78.4 kg')
    expect(dialog).toHaveTextContent('2,140 kcal')
    expect(dialog).toHaveTextContent('142 g protein')
    expect(dialog).toHaveTextContent('2.8 L')
    expect(dialog).toHaveTextContent('4 / 5')
    expect(dialog).not.toHaveTextContent('No progress recorded')
  })

  it('omits a section entirely when that kind of activity did not happen, even if others did', async () => {
    mockedUseProgressCalendar.mockReturnValue(
      makeHookValue({
        getActivity: (date: string) => ({ ...NO_ACTIVITY, date, workout: true, hasActivity: true }),
      }),
    )
    const user = userEvent.setup()
    render(<ProgressCalendarCard />)

    await user.click(screen.getByRole('button', { name: /^Today,/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Completed')
    expect(dialog).not.toHaveTextContent('kg')
    expect(dialog).not.toHaveTextContent('kcal')
  })

  it('formats water in millilitres when that is the user’s preferred unit', async () => {
    mockedUseHabitStore.mockReturnValue({
      habits: [],
      entries: [],
      waterLogs: [],
      waterGoal: { goalMl: 2500, preferredUnit: 'ml' },
    } satisfies HabitStoreState)
    mockedUseProgressCalendar.mockReturnValue(
      makeHookValue({ getActivity: (date: string) => ({ ...NO_ACTIVITY, date, waterMl: 2800, hasActivity: true }) }),
    )
    const user = userEvent.setup()
    render(<ProgressCalendarCard />)

    await user.click(screen.getByRole('button', { name: /^Today,/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('2800 ml')
  })
})

describe('ProgressCalendarCard — indicator dots', () => {
  it('shows one dot per kind of activity that happened, and none for a day with no activity', () => {
    mockedUseProgressCalendar.mockReturnValue(
      makeHookValue({
        getActivity: (date: string) =>
          date === '2026-09-16'
            ? { date, workout: true, weightKg: 78.4, nutrition: null, waterMl: null, habits: null, hasActivity: true }
            : { ...NO_ACTIVITY, date },
      }),
    )
    render(<ProgressCalendarCard />)

    const todayButton = screen.getByRole('button', { name: /^Today,/ })
    expect(todayButton.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(2)

    const emptyDayButton = screen.getByRole('button', { name: /^Tuesday, September 15, 2026\. No activity logged\./ })
    expect(emptyDayButton.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(0)
  })
})
