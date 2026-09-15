import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { mockPersonalRecords, mockStrengthProgress, mockWeightHistory, mockWorkoutStats } from '@/data/mockProgress'

const CHART_COLORS = {
  accent: '#B7F34A',
  secondary: '#45D6FF',
  purple: '#9B7BFF',
  grid: '#262F39',
  muted: '#6B7684',
}

const tooltipStyle = {
  backgroundColor: '#1B232C',
  border: '1px solid #262F39',
  borderRadius: 12,
  color: '#F4F6F8',
  fontSize: 12,
}

export function Progress() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Progress</h1>
        <p className="mt-1 text-sm text-text-secondary">Your training and body composition trends</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {mockWorkoutStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} unit={stat.hint} />
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Weight Trend</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </div>
            <Badge variant="success">-3.7 kg</Badge>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockWeightHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={CHART_COLORS.muted}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART_COLORS.grid }} />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_COLORS.accent, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Strength Progress</CardTitle>
              <CardDescription>Estimated 1-rep max by lift</CardDescription>
            </div>
            <div className="flex gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.accent }} />
                Bench
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
                Squat
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS.purple }} />
                Deadlift
              </span>
            </div>
          </CardHeader>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockStrengthProgress} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="month" stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART_COLORS.grid }} />
                <Line type="monotone" dataKey="benchKg" stroke={CHART_COLORS.accent} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="squatKg" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="deadliftKg" stroke={CHART_COLORS.purple} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-accent" />
              <CardTitle>Personal Records</CardTitle>
            </div>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-border">
            {mockPersonalRecords.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{pr.exercise}</p>
                  <p className="text-xs text-text-muted">{pr.date}</p>
                </div>
                <p className="font-display text-sm font-semibold text-text-primary">
                  {pr.weightKg} kg <span className="font-normal text-text-muted">× {pr.reps}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>
    </motion.div>
  )
}
