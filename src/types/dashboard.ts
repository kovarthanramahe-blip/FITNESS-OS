export interface DailyHabitSummary {
  id: string
  label: string
  completed: boolean
}

export interface DashboardSummary {
  greetingName: string
  dailyScore: number
  level: number
  xp: number
  xpToNextLevel: number
  streakDays: number
  caloriesConsumed: number
  caloriesTarget: number
  proteinG: number
  proteinTargetG: number
  waterMl: number
  waterTargetMl: number
  steps: number
  stepsTarget: number
  weightKg: number
  weightChangeKg: number
  habits: DailyHabitSummary[]
}
