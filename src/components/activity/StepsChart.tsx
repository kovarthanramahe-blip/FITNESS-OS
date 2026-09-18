import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CHART_COLORS, chartTooltipStyle } from '@/components/shared/chartTheme'
import type { StepsHistoryPoint } from '@/utils/activity'
import { parseDateOnly } from '@/utils/dateRange'

export interface StepsChartProps {
  history: StepsHistoryPoint[]
}

function toChartPoint(point: StepsHistoryPoint) {
  return { ...point, label: parseDateOnly(point.date).toLocaleDateString(undefined, { weekday: 'short' }) }
}

export function StepsChart({ history }: StepsChartProps) {
  const data = history.map(toChartPoint)

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Steps — Last 7 Days</CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <p className="text-sm text-text-secondary">No step data recorded yet.</p>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="label" stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} interval={0} />
              <YAxis stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value) => [`${value} steps`, 'Steps']}
              />
              <Bar dataKey="steps" radius={[6, 6, 0, 0]} maxBarSize={28} fill={CHART_COLORS.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
