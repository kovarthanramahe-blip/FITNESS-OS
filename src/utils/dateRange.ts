import type { TimeRange } from '@/types/shared'

const RANGE_DAYS: Record<Exclude<TimeRange, 'ALL'>, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

export function isWithinRange(dateIso: string, range: TimeRange, now: Date = new Date()): boolean {
  if (range === 'ALL') return true
  const cutoff = now.getTime() - RANGE_DAYS[range] * 86_400_000
  return new Date(dateIso).getTime() >= cutoff
}

export function filterByRange<T>(
  items: T[],
  getDate: (item: T) => string,
  range: TimeRange,
  now: Date = new Date(),
): T[] {
  return items.filter((item) => isWithinRange(getDate(item), range, now))
}

/** Today as a yyyy-mm-dd date-only string, in the local timezone. */
export function getTodayDateString(now: Date = new Date()): string {
  return toDateString(now)
}

/** A Date at local midnight as a yyyy-mm-dd string — avoids the UTC/local mismatch of `date.toISOString()`. */
export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parses a yyyy-mm-dd date-only string into a local-midnight `Date`.
 * `new Date(dateStr)` reads the same string as UTC midnight instead, which
 * silently shifts the calendar day (and its weekday) by one for any user
 * whose local timezone is behind UTC — this constructs the date from its
 * y/m/d components instead, so the result is never timezone-dependent.
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year!, (month ?? 1) - 1, day)
}

/** Day of week (0 = Sunday .. 6 = Saturday) for a yyyy-mm-dd date-only string, computed in local time. */
export function getDayOfWeek(dateStr: string): number {
  return parseDateOnly(dateStr).getDay()
}

/** Adds (or subtracts, for negative values) whole days to a date-only string. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}
