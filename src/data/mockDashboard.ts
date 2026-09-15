import type { DashboardSummary } from '@/types/dashboard'

export const mockDashboard: DashboardSummary = {
  greetingName: 'Kovarthan',
  dailyScore: 82,
  level: 7,
  xp: 3450,
  xpToNextLevel: 4000,
  streakDays: 12,
  caloriesConsumed: 1640,
  caloriesTarget: 2400,
  proteinG: 118,
  proteinTargetG: 160,
  waterMl: 1800,
  waterTargetMl: 3000,
  steps: 6420,
  stepsTarget: 10000,
  weightKg: 78.4,
  weightChangeKg: -0.6,
  habits: [
    { id: 'water', label: 'Drink 3L water', completed: false },
    { id: 'workout', label: 'Complete workout', completed: false },
    { id: 'steps', label: 'Hit 10,000 steps', completed: false },
    { id: 'supplement', label: 'Take multivitamin', completed: true },
    { id: 'sleep', label: 'Sleep 7+ hours', completed: true },
  ],
}
