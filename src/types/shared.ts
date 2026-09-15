/**
 * A relative date-range filter shared by any chart/summary that lets the
 * user scope data to a recent window — the Progress page's weight/strength
 * charts and the Nutrition page's history both filter against this same
 * set of ranges via utils/dateRange.ts.
 */
export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL'
