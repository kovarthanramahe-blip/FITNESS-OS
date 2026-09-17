import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DateNavigator } from './DateNavigator'

// Pinned so "today" falls inside September, 2026 — the exact scenario the
// reported bug hit: navigation must not stop at today just because today
// happens to be in September.
const TODAY = new Date(2026, 8, 16)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

function Harness({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate)
  return <DateNavigator date={date} onChange={setDate} />
}

function clickNextDay() {
  fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
}

function clickPreviousDay() {
  fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
}

describe('DateNavigator — forward navigation is never blocked at today', () => {
  it('the "Next day" button is enabled even when the visible date is today', () => {
    render(<Harness initialDate="2026-09-16" />)
    expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled()
  })

  it('the date picker has no max attribute stopping selection beyond today', () => {
    render(<Harness initialDate="2026-09-16" />)
    expect(screen.getByLabelText('Nutrition date')).not.toHaveAttribute('max')
  })

  it('clicking "Next day" from today moves one day past today, into the future', () => {
    render(<Harness initialDate="2026-09-16" />)

    clickNextDay()

    expect(screen.getByLabelText('Nutrition date')).toHaveValue('2026-09-17')
    expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled()
  })
})

describe('DateNavigator — September 2026 → October 2026 → November 2026', () => {
  it('repeated "Next day" clicks cross from September into October', () => {
    render(<Harness initialDate="2026-09-28" />)

    for (let i = 0; i < 5; i += 1) clickNextDay()

    expect(screen.getByLabelText('Nutrition date')).toHaveValue('2026-10-03')
  })

  it('repeated "Next day" clicks cross from October into November', () => {
    render(<Harness initialDate="2026-10-29" />)

    for (let i = 0; i < 4; i += 1) clickNextDay()

    expect(screen.getByLabelText('Nutrition date')).toHaveValue('2026-11-02')
  })

  it('the date picker accepts a direct jump to an October or November date', () => {
    render(<Harness initialDate="2026-09-16" />)

    const input = screen.getByLabelText('Nutrition date')
    fireEvent.change(input, { target: { value: '2026-11-05' } })

    expect(input).toHaveValue('2026-11-05')
  })
})

describe('DateNavigator — previous-month navigation still works', () => {
  it('repeated "Previous day" clicks cross back from October into September', () => {
    render(<Harness initialDate="2026-10-03" />)

    for (let i = 0; i < 5; i += 1) clickPreviousDay()

    expect(screen.getByLabelText('Nutrition date')).toHaveValue('2026-09-28')
  })
})

describe('DateNavigator — the "Today" shortcut', () => {
  it('is hidden while already on today, and appears once navigated away', () => {
    render(<Harness initialDate="2026-09-16" />)
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()

    clickNextDay()
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
  })

  it('jumps back to today from a future date', () => {
    render(<Harness initialDate="2026-10-15" />)

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByLabelText('Nutrition date')).toHaveValue('2026-09-16')
  })
})
