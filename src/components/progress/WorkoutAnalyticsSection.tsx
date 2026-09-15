import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import type { WorkoutAnalyticsSummary } from '@/utils/progress'

export interface WorkoutAnalyticsSectionProps {
  analytics: WorkoutAnalyticsSummary
}

export function WorkoutAnalyticsSection({ analytics }: WorkoutAnalyticsSectionProps) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Workout Analytics</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Workouts" value={String(analytics.totalWorkouts)} />
        <StatCard label="This Week" value={String(analytics.workoutsThisWeek)} />
        <StatCard label="This Month" value={String(analytics.workoutsThisMonth)} />
        <StatCard label="Week Streak" value={String(analytics.currentWeekStreak)} unit={analytics.currentWeekStreak === 1 ? 'week' : 'weeks'} />
        <StatCard
          label="Avg. Duration"
          value={analytics.avgDurationMinutes === null ? '—' : String(analytics.avgDurationMinutes)}
          unit={analytics.avgDurationMinutes === null ? undefined : 'min'}
        />
        <StatCard label="Total Volume" value={analytics.totalVolumeKg.toLocaleString()} unit="kg" />
        <StatCard
          label="Avg. Weekly Volume"
          value={analytics.avgWeeklyVolumeKg === null ? '—' : analytics.avgWeeklyVolumeKg.toLocaleString()}
          unit={analytics.avgWeeklyVolumeKg === null ? undefined : 'kg'}
        />
        <StatCard label="Personal Records" value={String(analytics.personalRecordCount)} />
      </div>
    </Card>
  )
}
