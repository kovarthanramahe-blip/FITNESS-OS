import { LineChart, Scale, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { WeightLog } from '@/types/progress'
import type { MacroTargets, MacroTotals } from '@/types/nutrition'
import { getWeightChangeOverDays } from '@/utils/progress'
import { getTargetPercent } from '@/utils/nutrition'

export interface NutritionInsightsProps {
  totals: MacroTotals
  targets: MacroTargets
  weightLogs: WeightLog[]
}

interface Insight {
  id: string
  icon: LucideIcon
  text: string
}

const WEIGHT_TREND_WINDOW_DAYS = 30

function buildInsights({ totals, targets, weightLogs }: NutritionInsightsProps): Insight[] {
  const insights: Insight[] = []

  const weightChange = getWeightChangeOverDays(weightLogs, WEIGHT_TREND_WINDOW_DAYS)
  insights.push({
    id: 'weight-trend',
    icon: Scale,
    text:
      weightChange === null
        ? 'Not enough weight entries yet to show a trend over the selected period.'
        : `Weight trend: ${weightChange > 0 ? '+' : ''}${weightChange} kg over the last ${WEIGHT_TREND_WINDOW_DAYS} days.`,
  })

  const caloriePercent = getTargetPercent(totals.calories, targets.calories)
  insights.push({
    id: 'calorie-target',
    icon: UtensilsCrossed,
    text: `Nutrition target: ${Math.round(caloriePercent)}% of today's calorie target.`,
  })

  insights.push({
    id: 'protein',
    icon: LineChart,
    text: `Protein: ${totals.protein} / ${targets.protein} g.`,
  })

  return insights
}

export function NutritionInsights(props: NutritionInsightsProps) {
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
