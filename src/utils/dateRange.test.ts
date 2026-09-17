import { afterEach, describe, expect, it } from 'vitest'
import { addDaysToDateString, getDayOfWeek, getTodayDateString, parseDateOnly, toDateString } from './dateRange'

// Simulating other timezones below needs `process.env['TZ']`, which this project's
// tsconfig doesn't otherwise expose (no other source file touches the Node runtime).
declare const process: { env: Record<string, string | undefined> }

const ORIGINAL_TZ = process.env['TZ']

afterEach(() => {
  process.env['TZ'] = ORIGINAL_TZ
})

// 0 = Sunday .. 6 = Saturday
const MONDAY = 1
const TUESDAY = 2
const WEDNESDAY = 3
const THURSDAY = 4
const FRIDAY = 5

describe('getDayOfWeek — the reported bug: 2026-09-16 must be Wednesday, not Thursday', () => {
  it('2026-09-16 is Wednesday', () => {
    expect(getDayOfWeek('2026-09-16')).toBe(WEDNESDAY)
  })

  it('the day before, 2026-09-15, is Tuesday', () => {
    expect(getDayOfWeek('2026-09-15')).toBe(TUESDAY)
  })

  it('the day after, 2026-09-17, is Thursday', () => {
    expect(getDayOfWeek('2026-09-17')).toBe(THURSDAY)
  })

  it('is stable regardless of the process timezone (a calendar date has exactly one weekday)', () => {
    for (const tz of ['UTC', 'America/New_York', 'Pacific/Kiritimati', 'Asia/Kolkata', 'Pacific/Midway']) {
      process.env['TZ'] = tz
      expect(getDayOfWeek('2026-09-16')).toBe(WEDNESDAY)
    }
  })
})

describe('getDayOfWeek — month and year boundaries', () => {
  it('a month boundary: 2026-08-31 (Mon) into 2026-09-01 (Tue)', () => {
    expect(getDayOfWeek('2026-08-31')).toBe(MONDAY)
    expect(getDayOfWeek('2026-09-01')).toBe(TUESDAY)
  })

  it('a year boundary: 2026-12-31 (Thu) into 2027-01-01 (Fri)', () => {
    expect(getDayOfWeek('2026-12-31')).toBe(THURSDAY)
    expect(getDayOfWeek('2027-01-01')).toBe(FRIDAY)
  })

  it('a leap-year February boundary: 2028-02-29 (Tue) into 2028-03-01 (Wed)', () => {
    expect(getDayOfWeek('2028-02-29')).toBe(TUESDAY)
    expect(getDayOfWeek('2028-03-01')).toBe(WEDNESDAY)
  })
})

describe('parseDateOnly — never shifts the calendar day, unlike `new Date(dateOnlyString)`', () => {
  it('preserves the exact year/month/day for 2026-09-16', () => {
    const date = parseDateOnly('2026-09-16')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 16])
  })

  it('stays on 2026-09-16 regardless of the process timezone', () => {
    for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env['TZ'] = tz
      const date = parseDateOnly('2026-09-16')
      expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getDay()]).toEqual([2026, 8, 16, WEDNESDAY])
    }
  })
})

describe('getTodayDateString — the root-cause bug: `new Date().toISOString().slice(0, 10)` rolls to tomorrow', () => {
  it("matches the injected wall-clock date exactly, for a 'now' that is genuinely Sept 16", () => {
    expect(getTodayDateString(new Date(2026, 8, 16, 23, 0, 0))).toBe('2026-09-16')
  })

  it('late in the evening in a negative-UTC-offset timezone, still reports the local calendar day — not tomorrow', () => {
    process.env['TZ'] = 'America/New_York'
    // 2026-09-16T23:00 local (EDT, UTC-4) = 2026-09-17T03:00 UTC.
    // The old `new Date().toISOString().slice(0, 10)` pattern would read this as "2026-09-17" (Thursday) —
    // exactly the reported bug. getTodayDateString must report the local day, 2026-09-16 (Wednesday).
    const lateEveningLocal = new Date(2026, 8, 16, 23, 0, 0)
    const dateStr = getTodayDateString(lateEveningLocal)
    expect(dateStr).toBe('2026-09-16')
    expect(getDayOfWeek(dateStr)).toBe(WEDNESDAY)
  })

  it('early morning in a positive-UTC-offset timezone still reports the local calendar day', () => {
    process.env['TZ'] = 'Asia/Kolkata'
    const earlyMorningLocal = new Date(2026, 8, 16, 0, 30, 0)
    expect(getTodayDateString(earlyMorningLocal)).toBe('2026-09-16')
  })
})

describe('toDateString — round trip with parseDateOnly', () => {
  it('round-trips every date in this regression set', () => {
    for (const dateStr of ['2026-09-15', '2026-09-16', '2026-09-17', '2026-08-31', '2026-09-01', '2026-12-31', '2027-01-01']) {
      expect(toDateString(parseDateOnly(dateStr))).toBe(dateStr)
    }
  })
})

describe('addDaysToDateString — boundaries stay correct', () => {
  it('crosses a month boundary forward', () => {
    expect(addDaysToDateString('2026-08-31', 1)).toBe('2026-09-01')
  })

  it('crosses a year boundary forward', () => {
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('crosses a year boundary backward', () => {
    expect(addDaysToDateString('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('steps through the reported week without drifting', () => {
    expect(addDaysToDateString('2026-09-16', -1)).toBe('2026-09-15')
    expect(addDaysToDateString('2026-09-16', 1)).toBe('2026-09-17')
  })
})
