import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import type { StrengthProgressPoint } from '@/types/progress'
import { CHART_COLORS, chartTooltipStyle } from './chartTheme'

export interface StrengthChartProps {
  history: StrengthProgressPoint[]
}

function formatChartDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TooltipPayloadEntry {
  value: number
  payload: StrengthProgressPoint
}

function StrengthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0 || !label) return null
  const entry = payload[0]
  if (!entry) return null
  return (
    <div style={chartTooltipStyle} className="px-3 py-2">
      <p className="text-text-secondary">{formatChartDate(label)}</p>
      <p className="font-semibold text-text-primary">Est. 1RM: {Math.round(entry.value)} kg</p>
      <p className="text-xs text-text-muted">
        Best set: {entry.payload.weightKg} kg × {entry.payload.reps}
      </p>
    </div>
  )
}

export function StrengthChart({ history }: StrengthChartProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="No sets logged for this exercise yet"
        description="Complete a workout that includes this exercise to start tracking strength progress."
      />
    )
  }

  const estimates = history.map((point) => point.estimatedOneRepMax)
  const min = Math.min(...estimates)
  const max = Math.max(...estimates)
  const padding = Math.max((max - min) * 0.15, 2)

  return (
    <div className="h-64 w-full">
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
          <YAxis
            stroke={CHART_COLORS.muted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[min - padding, max + padding]}
          />
          <Tooltip content={<StrengthTooltip />} cursor={{ stroke: CHART_COLORS.grid }} />
          <Line
            type="monotone"
            dataKey="estimatedOneRepMax"
            stroke={CHART_COLORS.purple}
            strokeWidth={2.5}
            dot={history.length < 15 ? { r: 3, fill: CHART_COLORS.purple, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={history.length > 1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
