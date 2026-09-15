import { Droplets, Flame, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { WaterGoal, WaterLog } from '@/types/habits'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { getDailyWaterMl, getWaterGoalPercent, type TodaysHabitsSummary } from '@/utils/habits'

export interface HabitInsightsProps {
  summary: TodaysHabitsSummary
  waterLogs: WaterLog[]
  waterGoal: WaterGoal
}

interface Insight {
  id: string
  icon: LucideIcon
  text: string
}

function buildInsights({ summary, waterLogs, waterGoal }: HabitInsightsProps): Insight[] {
  const today = getTodayDateString()
  const weekTotalMl = Array.from({ length: 7 }, (_, index) => getDailyWaterMl(waterLogs, addDaysToDateString(today, -index))).reduce(
    (total, ml) => total + ml,
    0,
  )
  const weeklyGoalMl = waterGoal.goalMl * 7
  const hydrationPercent = getWaterGoalPercent(weekTotalMl, weeklyGoalMl)

  const insights: Insight[] = [
    {
      id: 'hydration',
      icon: Droplets,
      text: weeklyGoalMl > 0 ? `Hydration is ${Math.round(hydrationPercent)}% complete this week.` : 'Set a water goal to see a weekly hydration insight.',
    },
    {
      id: 'streak',
      icon: Flame,
      text:
        summary.bestCurrentStreak > 0
          ? `Your best current streak is ${summary.bestCurrentStreak} ${summary.bestCurrentStreak === 1 ? 'day' : 'days'}.`
          : 'No active streaks yet — complete a scheduled habit to start one.',
    },
    {
      id: 'today',
      icon: ListChecks,
      text:
        summary.scheduled === 0
          ? 'No habits are scheduled today.'
          : `${summary.completed} of ${summary.scheduled} scheduled habits were completed today.`,
    },
  ]

  return insights
}

export function HabitInsights(props: HabitInsightsProps) {
  const insights = buildInsights(props)

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <ul className="flex flex-col gap-3">
        {insights.map((insight) => (
          <li key={insight.id} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
              <insight.icon className="size-4" />
            </span>
            <p className="pt-1.5 text-sm text-text-secondary">{insight.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
