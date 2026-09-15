import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DayActivityStatus, WeekActivityDay } from '@/types/dashboard'
import { cn } from '@/utils/cn'

export interface WeeklyActivityChartProps {
  week: WeekActivityDay[]
  className?: string
}

const STATUS_COLOR: Record<DayActivityStatus, string> = {
  complete: '#B7F34A',
  rest: '#9B7BFF',
  missed: '#333E4A',
  upcoming: '#1B232C',
}

const CHART_GRID = '#262F39'
const CHART_MUTED = '#6B7684'

const tooltipStyle = {
  backgroundColor: '#1B232C',
  border: '1px solid #262F39',
  borderRadius: 12,
  color: '#F4F6F8',
  fontSize: 12,
}

export function WeeklyActivityChart({ week, className }: WeeklyActivityChartProps) {
  return (
    <Card padding="lg" className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Weekly Activity</CardTitle>
          <p className="mt-0.5 text-xs text-text-muted">Calories burned per day (estimate)</p>
        </div>
      </CardHeader>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={week} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="day" stroke={CHART_MUTED} fontSize={12} tickLine={false} axisLine={false} interval={0} />
            <YAxis stroke={CHART_MUTED} fontSize={12} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(value) => [`${value} kcal (est.)`, 'Calories burned']}
            />
            <Bar dataKey="caloriesBurned" radius={[6, 6, 0, 0]} maxBarSize={28}>
              {week.map((day) => (
                <Cell key={day.day} fill={STATUS_COLOR[day.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Workout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-purple" />
          Rest day
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-border-strong" />
          Missed
        </span>
      </div>
    </Card>
  )
}
