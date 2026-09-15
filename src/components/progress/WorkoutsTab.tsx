import { PersonalRecordsCard } from '@/components/dashboard/PersonalRecordsCard'
import { useProgressStore } from '@/lib/progressStore'
import { getCompletedSessionsMostRecentFirst, useWorkoutStore } from '@/lib/workoutStore'
import { getWeeklyFrequency, getWorkoutAnalytics } from '@/utils/progress'
import { InsightsList } from './InsightsList'
import { WeeklyFrequencyStrip } from './WeeklyFrequencyStrip'
import { WorkoutAnalyticsSection } from './WorkoutAnalyticsSection'

const RECENT_PR_COUNT = 5

export function WorkoutsTab() {
  const { history, personalRecords } = useWorkoutStore()
  const { weightLogs } = useProgressStore()
  const sessions = getCompletedSessionsMostRecentFirst()

  const analytics = getWorkoutAnalytics(history, personalRecords)
  const week = getWeeklyFrequency(history)
  const recentRecords = [...personalRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_PR_COUNT)

  return (
    <div className="flex flex-col gap-6">
      <WorkoutAnalyticsSection analytics={analytics} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WeeklyFrequencyStrip week={week} />
        <InsightsList weightLogs={weightLogs} sessions={sessions} history={history} />
      </div>
      <PersonalRecordsCard records={recentRecords} />
    </div>
  )
}
