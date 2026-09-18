import { getMetOption } from '@/data/activityCatalogue'
import type { ActivityEntry, DailySteps } from '@/types/activity'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { estimateCaloriesBurned } from '@/utils/activity'

/** A representative body weight for seeding demo calorie estimates only — never used for a real user's own data. */
const DEMO_BODY_WEIGHT_KG = 78

function daysAgoDateString(days: number): string {
  return addDaysToDateString(getTodayDateString(), -days)
}

function buildEntry(daysAgo: number, metOptionId: string, durationMinutes: number, notes?: string): ActivityEntry {
  const option = getMetOption(metOptionId)!
  const date = daysAgoDateString(daysAgo)
  return {
    id: `seed-activity-${metOptionId}-${daysAgo}`,
    date,
    activityType: option.activityType,
    intensity: option.intensity,
    metOptionId,
    durationMinutes,
    estimatedCalories: estimateCaloriesBurned(option.met, DEMO_BODY_WEIGHT_KG, durationMinutes),
    notes,
    createdAt: `${date}T18:00:00.000Z`,
  }
}

export const mockActivityEntries: ActivityEntry[] = [
  buildEntry(0, 'running-moderate', 30, 'Easy morning run'),
  buildEntry(1, 'cycling-moderate', 45),
  buildEntry(3, 'badminton-moderate', 60, 'Doubles with friends'),
  buildEntry(5, 'swimming-light', 40),
  buildEntry(8, 'hiking-moderate', 90, 'Weekend trail'),
  buildEntry(10, 'calisthenics-vigorous', 25),
  buildEntry(14, 'basketball-moderate', 50),
]

/** ~2 weeks of sample daily step totals, trending around a realistic 6–11k range. */
function buildMockSteps(): DailySteps[] {
  const pattern = [8200, 10450, 6300, 9100, 11200, 7400, 8900, 9600, 5200, 10100, 8800, 7100, 9900, 8400]
  return pattern.map((steps, index) => {
    const date = daysAgoDateString(index)
    return { id: `seed-steps-${date}`, date, steps, source: 'manual' as const, createdAt: `${date}T22:00:00.000Z` }
  })
}

export const mockDailySteps: DailySteps[] = buildMockSteps()
