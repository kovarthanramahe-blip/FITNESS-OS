import type { DashboardData, DashboardHabit, WeekActivityDay } from '@/types/dashboard'
import { mockHabits } from '@/data/mockHabits'
import { mockTodayWorkout } from '@/data/mockWorkout'
import { summarizeWorkout } from '@/utils/dashboard'

const DASHBOARD_HABIT_IDS = ['workout', 'water', 'protein', 'steps', 'supplement', 'sleep']

const dashboardHabits: DashboardHabit[] = DASHBOARD_HABIT_IDS.map((id) => {
  const habit = mockHabits.find((candidate) => candidate.id === id)
  if (!habit) throw new Error(`Missing habit "${id}" in mockHabits`)
  return { id: habit.id, label: habit.name, icon: habit.icon, completed: habit.completedToday }
})

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
  header: {
    name: 'Kovarthan',
    fullName: 'Kovarthan Ramahe',
  },
  dailyScore: {
    score: 78,
    max: 100,
  },
  workout: summarizeWorkout(mockTodayWorkout),
  calories: {
    label: 'Calories',
    unit: 'kcal',
    consumed: 1680,
    target: 2200,
  },
  protein: {
    label: 'Protein',
    unit: 'g',
    consumed: 118,
    target: 150,
  },
  water: {
    consumedMl: 2100,
    targetMl: 3000,
  },
  steps: {
    steps: 7842,
    target: 10000,
  },
  weight: {
    currentKg: 72.4,
    changeKg: -0.6,
    changePeriodLabel: 'this month',
    targetKg: 68,
    trend: [73.6, 73.3, 73.0, 72.7, 72.5, 72.4],
  },
  streak: {
    days: 14,
  },
  level: {
    level: 12,
    xp: 2840,
    xpToNextLevel: 3000,
  },
  habits: dashboardHabits,
  weeklyActivity,
}
