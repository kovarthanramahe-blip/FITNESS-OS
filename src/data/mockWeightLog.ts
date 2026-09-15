import type { WeightGoal, WeightLog } from '@/types/progress'

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

/** Weekly-ish weigh-ins over the last ~12 weeks, most recent last. */
const WEEKLY_WEIGHTS_KG: Array<[daysAgo: number, weightKg: number]> = [
  [84, 78.0],
  [77, 77.6],
  [70, 77.1],
  [63, 76.5],
  [56, 75.9],
  [49, 75.3],
  [42, 74.7],
  [35, 74.1],
  [28, 73.6],
  [21, 73.3],
  [14, 73.0],
  [7, 72.7],
  [0, 72.4],
]

export const mockWeightLogs: WeightLog[] = WEEKLY_WEIGHTS_KG.map(([daysAgo, weightKg], index) => ({
  id: `seed-weight-${index}`,
  date: daysAgoDateString(daysAgo),
  weightKg,
}))

export const mockWeightGoal: WeightGoal = {
  startingWeightKg: 78.0,
  targetWeightKg: 68.0,
  startDate: mockWeightLogs[0]?.date ?? daysAgoDateString(84),
}
