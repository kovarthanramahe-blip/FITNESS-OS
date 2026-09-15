import { Flame, LineChart, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { WeightLog } from '@/types/progress'
import type { WorkoutHistoryEntry, WorkoutSession } from '@/types/workout'
import { getCurrentWeekStreak, getVolumeTrend, getWeightChangeOverDays } from '@/utils/progress'

export interface InsightsListProps {
  weightLogs: WeightLog[]
  sessions: WorkoutSession[]
  history: WorkoutHistoryEntry[]
}

interface Insight {
  id: string
  icon: LucideIcon
  text: string
}

function buildInsights({ weightLogs, sessions, history }: InsightsListProps): Insight[] {
  const insights: Insight[] = []

  const weightChange = getWeightChangeOverDays(weightLogs, 30)
  insights.push({
    id: 'weight-trend',
    icon: Scale,
    text:
      weightChange === null
        ? 'Not enough weight entries yet to show a 30-day trend.'
        : weightChange === 0
          ? 'Your weight has stayed steady over the last 30 days.'
          : `Your weight has changed by ${weightChange > 0 ? '+' : ''}${weightChange} kg over the last 30 days.`,
  })

  const volumeTrend = getVolumeTrend(sessions, null, 30)
  insights.push({
    id: 'volume-trend',
    icon: LineChart,
    text:
      volumeTrend.changePercent === null
        ? 'Not enough workout history yet to compare training volume month over month.'
        : `Training volume in the last 30 days is ${volumeTrend.changePercent > 0 ? 'up' : 'down'} ${Math.abs(volumeTrend.changePercent)}% compared to the 30 days before.`,
  })

  const streak = getCurrentWeekStreak(history)
  insights.push({
    id: 'consistency',
    icon: Flame,
    text:
      streak === 0
        ? 'No workouts logged this week yet.'
        : `You've trained at least once for ${streak} consecutive ${streak === 1 ? 'week' : 'weeks'}.`,
  })

  return insights
}

export function InsightsList(props: InsightsListProps) {
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
