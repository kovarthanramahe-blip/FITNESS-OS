import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { isHabitScheduledOn } from '@/utils/habits'
import type { Habit, HabitEntry, WaterGoal, WaterLog } from '@/types/habits'

function daysAgoDateString(days: number): string {
  return addDaysToDateString(getTodayDateString(), -days)
}

const CREATED_28_DAYS_AGO = `${daysAgoDateString(28)}T00:00:00.000Z`

export const mockHabits: Habit[] = [
  {
    id: 'habit-workout',
    name: 'Complete workout',
    description: 'Follow today’s training plan.',
    icon: 'dumbbell',
    category: 'fitness',
    frequency: { type: 'daily' },
    target: 1,
    unit: 'session',
    reminderEnabled: false,
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-protein',
    name: 'Hit protein target',
    description: 'Reach today’s protein goal from the Nutrition page.',
    icon: 'beef',
    category: 'nutrition',
    frequency: { type: 'daily' },
    target: 1,
    unit: 'day',
    reminderEnabled: false,
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-steps',
    name: 'Hit step goal',
    description: 'Stay active throughout the day.',
    icon: 'footprints',
    category: 'fitness',
    frequency: { type: 'daily' },
    target: 10000,
    unit: 'steps',
    reminderEnabled: false,
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-sleep',
    name: 'Sleep 7+ hours',
    description: 'A sample wellness target — adjust to what works for you.',
    icon: 'moon',
    category: 'sleep',
    frequency: { type: 'daily' },
    target: 7,
    unit: 'hours',
    reminderEnabled: false,
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-stretch',
    name: 'Stretch',
    description: 'A short mobility session.',
    icon: 'sparkles',
    category: 'wellness',
    frequency: { type: 'weekdays', days: [1, 3, 5] },
    target: 1,
    unit: 'session',
    reminderEnabled: true,
    reminderTime: '19:00',
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-multivitamin',
    name: 'Multivitamin',
    description: 'A sample reminder — not a dosage or medical recommendation.',
    icon: 'pill',
    category: 'supplements',
    frequency: { type: 'daily' },
    target: 1,
    unit: 'dose',
    reminderEnabled: true,
    reminderTime: '08:00',
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
  {
    id: 'habit-gym-bag',
    name: 'Prepare gym bag',
    description: 'Pack for tomorrow’s session the night before.',
    icon: 'checkCircle',
    category: 'custom',
    frequency: { type: 'weekdays', days: [0, 2, 4] },
    target: 1,
    unit: 'task',
    reminderEnabled: true,
    reminderTime: '20:00',
    active: true,
    createdAt: CREATED_28_DAYS_AGO,
  },
]

/**
 * ~4 weeks of sample completions per habit, respecting each habit's own
 * schedule, with a few gaps left in so pending/incomplete states have
 * something real to show.
 */
function buildMockEntries(): HabitEntry[] {
  const entries: HabitEntry[] = []
  let counter = 0

  for (const habit of mockHabits) {
    for (let daysAgo = 27; daysAgo >= 1; daysAgo -= 1) {
      const date = daysAgoDateString(daysAgo)
      if (!isHabitScheduledOn(habit.frequency, date)) continue
      // Skip roughly one in six scheduled days so streaks/history aren't a suspiciously perfect run.
      if (daysAgo % 6 === 0) continue
      counter += 1
      entries.push({
        id: `seed-habit-entry-${counter}`,
        habitId: habit.id,
        date,
        completedAt: `${date}T09:00:00.000Z`,
      })
    }
  }

  return entries
}

export const mockHabitEntries: HabitEntry[] = buildMockEntries()

export const mockWaterGoal: WaterGoal = {
  goalMl: 2500,
  preferredUnit: 'l',
}

function buildMockWaterLogs(): WaterLog[] {
  const logs: WaterLog[] = []
  let counter = 0
  const amounts = [250, 500, 250, 500, 250]

  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = daysAgoDateString(daysAgo)
    const entriesToday = daysAgo === 0 ? amounts.slice(0, 3) : amounts
    for (const [index, amountMl] of entriesToday.entries()) {
      counter += 1
      logs.push({
        id: `seed-water-${counter}`,
        date,
        amountMl,
        createdAt: `${date}T${String(7 + index * 3).padStart(2, '0')}:00:00.000Z`,
      })
    }
  }

  return logs
}

export const mockWaterLogs: WaterLog[] = buildMockWaterLogs()
