import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, chartTooltipStyle } from '@/components/shared/chartTheme'
import { EmptyState } from '@/components/ui/EmptyState'
import type { NutritionHistoryPoint } from '@/utils/nutrition'
import { parseDateOnly } from '@/utils/dateRange'

export interface NutritionHistoryChartProps {
  history: NutritionHistoryPoint[]
}

function formatChartDate(dateIso: string): string {
  return parseDateOnly(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TooltipPayloadEntry {
  dataKey: string
  value: number
  color: string
}

function HistoryTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  unit: string
}) {
  if (!active || !payload || payload.length === 0 || !label) return null
  return (
    <div style={chartTooltipStyle} className="px-3 py-2">
      <p className="text-text-secondary">{formatChartDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold text-text-primary" style={{ color: entry.color }}>
          {entry.dataKey}: {entry.value}
          {unit}
        </p>
      ))}
    </div>
  )
}

export function NutritionHistoryChart({ history }: NutritionHistoryChartProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="No nutrition history in this range"
        description="Log some food or choose a wider time range to see your trend."
      />
    )
  }

  const showDots = history.length < 15

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Calories</p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                stroke={CHART_COLORS.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<HistoryTooltip unit=" kcal" />} cursor={{ stroke: CHART_COLORS.grid }} />
              <Line
                type="monotone"
                dataKey="calories"
                stroke={CHART_COLORS.accent}
                strokeWidth={2.5}
                dot={showDots ? { r: 3, fill: CHART_COLORS.accent, strokeWidth: 0 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={history.length > 1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary">Macros</p>
          <div className="flex gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
              Protein
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.purple }} />
              Carbs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.warning }} />
              Fat
            </span>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                stroke={CHART_COLORS.muted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<HistoryTooltip unit="g" />} cursor={{ stroke: CHART_COLORS.grid }} />
              <Line
                type="monotone"
                dataKey="protein"
                stroke={CHART_COLORS.secondary}
                strokeWidth={2}
                dot={showDots ? { r: 2.5, fill: CHART_COLORS.secondary, strokeWidth: 0 } : false}
                isAnimationActive={history.length > 1}
              />
              <Line
                type="monotone"
                dataKey="carbohydrates"
                stroke={CHART_COLORS.purple}
                strokeWidth={2}
                dot={showDots ? { r: 2.5, fill: CHART_COLORS.purple, strokeWidth: 0 } : false}
                isAnimationActive={history.length > 1}
              />
              <Line
                type="monotone"
                dataKey="fat"
                stroke={CHART_COLORS.warning}
                strokeWidth={2}
                dot={showDots ? { r: 2.5, fill: CHART_COLORS.warning, strokeWidth: 0 } : false}
                isAnimationActive={history.length > 1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
