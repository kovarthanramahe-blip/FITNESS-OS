import type { HabitSchedule } from '@/types/habits'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** A short, human-readable description of a schedule, e.g. "Mon, Wed, Fri" or "3x / week". */
export function describeSchedule(schedule: HabitSchedule): string {
  if (schedule.type === 'daily') return 'Every day'
  if (schedule.type === 'weekly') return `${schedule.timesPerWeek}x / week`
  return [...schedule.days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_SHORT[day])
    .join(', ')
}
