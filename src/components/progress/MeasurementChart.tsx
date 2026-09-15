import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import type { BodyMeasurement } from '@/types/progress'
import { CHART_COLORS, chartTooltipStyle } from './chartTheme'

export interface MeasurementChartProps {
  measurements: BodyMeasurement[]
}

function formatChartDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TooltipPayloadEntry {
  value: number
  payload: { unit: string }
}

function MeasurementTooltip({
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
      <p className="font-semibold text-text-primary">
        {entry.value} {entry.payload.unit}
      </p>
    </div>
  )
}

export function MeasurementChart({ measurements }: MeasurementChartProps) {
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length === 0) {
    return <EmptyState title="No measurements logged" description="Add a measurement to start tracking this trend." />
  }

  const values = sorted.map((entry) => entry.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.15, 1)

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            width={36}
            domain={[min - padding, max + padding]}
          />
          <Tooltip content={<MeasurementTooltip />} cursor={{ stroke: CHART_COLORS.grid }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART_COLORS.secondary, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={sorted.length > 1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
