import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProgressTimeRange, WeightLog } from '@/types/progress'
import { filterByRange } from '@/utils/progress'
import { CHART_COLORS, chartTooltipStyle } from './chartTheme'

export interface WeightChartProps {
  logs: WeightLog[]
  targetWeightKg: number
  range: ProgressTimeRange
}

function formatChartDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TooltipPayloadEntry {
  value: number
}

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0 || !label) return null
  const value = payload[0]?.value
  if (value === undefined) return null
  return (
    <div style={chartTooltipStyle} className="px-3 py-2">
      <p className="text-text-secondary">{formatChartDate(label)}</p>
      <p className="font-semibold text-text-primary">{value.toFixed(1)} kg</p>
    </div>
  )
}

export function WeightChart({ logs, targetWeightKg, range }: WeightChartProps) {
  const filtered = filterByRange(logs, (log) => log.date, range)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No weigh-ins in this range"
        description="Log a weight entry or choose a wider time range to see your trend."
      />
    )
  }

  const weights = filtered.map((log) => log.weightKg)
  const minWeight = Math.min(...weights, targetWeightKg)
  const maxWeight = Math.max(...weights, targetWeightKg)
  const padding = Math.max((maxWeight - minWeight) * 0.1, 0.5)

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            domain={[minWeight - padding, maxWeight + padding]}
          />
          <Tooltip content={<WeightTooltip />} cursor={{ stroke: CHART_COLORS.grid }} />
          <ReferenceLine
            y={targetWeightKg}
            stroke={CHART_COLORS.purple}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Target', position: 'insideTopRight', fill: CHART_COLORS.purple, fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke={CHART_COLORS.accent}
            strokeWidth={2.5}
            dot={filtered.length < 15 ? { r: 3, fill: CHART_COLORS.accent, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={filtered.length > 1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
