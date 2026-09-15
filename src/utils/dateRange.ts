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
