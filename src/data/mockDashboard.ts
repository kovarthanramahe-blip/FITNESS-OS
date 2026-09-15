import type { DashboardData, WeekActivityDay } from '@/types/dashboard'

const weeklyActivity: WeekActivityDay[] = [
  { day: 'Mon', status: 'complete', workoutMinutes: 50, caloriesBurned: 410 },
  { day: 'Tue', status: 'complete', workoutMinutes: 40, caloriesBurned: 360 },
  { day: 'Wed', status: 'rest', workoutMinutes: 0, caloriesBurned: 0 },
  { day: 'Thu', status: 'complete', workoutMinutes: 55, caloriesBurned: 430 },
  { day: 'Fri', status: 'missed', workoutMinutes: 0, caloriesBurned: 0 },
  { day: 'Sat', status: 'complete', workoutMinutes: 35, caloriesBurned: 300 },
  { day: 'Sun', status: 'upcoming', workoutMinutes: 0, caloriesBurned: 0 },
]

export const mockDashboardData: DashboardData = {
  dailyScore: {
    score: 78,
    max: 100,
  },
  steps: {
    steps: 7842,
    target: 10000,
  },
  weeklyActivity,
}
