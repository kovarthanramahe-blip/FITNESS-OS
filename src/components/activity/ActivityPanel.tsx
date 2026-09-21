import { Flame, Footprints, Plus, Timer } from 'lucide-react'
import { useState } from 'react'
import { AddActivityModal } from '@/components/activity/AddActivityModal'
import { ActivityHistoryList } from '@/components/activity/ActivityHistoryList'
import { HealthConnectStatusCard } from '@/components/activity/HealthConnectStatusCard'
import { StepsChart } from '@/components/activity/StepsChart'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { DateNavigator } from '@/components/nutrition/DateNavigator'
import { useHealthConnect } from '@/hooks/useHealthConnect'
import { deleteActivity, logActivity, setStepsForDate, useActivityStore } from '@/lib/activityStore'
import { useProgressStore } from '@/lib/progressStore'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'
import { getCurrentWeightLog } from '@/utils/progress'
import { getDailyActivitySummary, getStepsForDate, getStepsHistory } from '@/utils/activity'

/**
 * The "Activity" side of Workout: cardio/movement tracking distinct from
 * strength training — logged sessions plus daily steps. Kept as a panel
 * inside the Workout page's own tab set (never a separate top-level nav
 * item, and never folded into Health Connect settings) so it reads as
 * naturally part of Workout, per the same Card/date-navigation language
 * already used across Nutrition and Progress.
 */
export function ActivityPanel() {
  const { entries, dailySteps } = useActivityStore()
  const { weightLogs } = useProgressStore()
  const currentWeightKg = getCurrentWeightLog(weightLogs)?.weightKg ?? null
  const healthConnect = useHealthConnect()

  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [stepsInput, setStepsInput] = useState('')

  const today = getTodayDateString()
  const yesterday = addDaysToDateString(today, -1)

  const summary = getDailyActivitySummary(entries, selectedDate)
  const stepsToday = getStepsForDate(dailySteps, today)
  const stepsYesterday = getStepsForDate(dailySteps, yesterday)
  const stepsSelected = getStepsForDate(dailySteps, selectedDate)
  const last7DaysHistory = getStepsHistory(dailySteps, '7D')

  function handleSaveActivity(input: { activityType: (typeof entries)[number]['activityType']; metOptionId: string; durationMinutes: number; date: string; notes?: string }) {
    logActivity({ ...input, currentWeightKg })
  }

  function handleSaveSteps() {
    const value = Number(stepsInput)
    if (!Number.isFinite(value) || value < 0) return
    setStepsForDate(Math.round(value), selectedDate)
    setStepsInput('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateNavigator date={selectedDate} onChange={setSelectedDate} ariaLabel="Activity date" />
        <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setIsAddOpen(true)}>
          Add Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Steps" value={stepsSelected.toLocaleString()} icon={Footprints} accent="secondary" />
        <StatCard label="Active Minutes" value={String(summary.totalDurationMinutes)} unit="min" icon={Timer} accent="purple" />
        <StatCard label="Estimated Calories" value={String(summary.totalEstimatedCalories)} unit="kcal" icon={Flame} accent="accent" />
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Steps</CardTitle>
          {healthConnect.status === 'connected' && (
            <span className="text-xs text-text-muted">Source: Health Connect</span>
          )}
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Today</p>
            <p className="font-display text-xl font-semibold text-text-primary">{stepsToday.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Yesterday</p>
            <p className="font-display text-xl font-semibold text-text-primary">{stepsYesterday.toLocaleString()}</p>
          </div>
          <div className="flex items-end gap-2">
            <Input
              label="Log steps for this date"
              type="number"
              inputMode="numeric"
              min={0}
              value={stepsInput}
              onChange={(event) => setStepsInput(event.target.value)}
              placeholder={String(stepsSelected)}
            />
            <Button variant="secondary" onClick={handleSaveSteps} disabled={stepsInput.trim().length === 0}>
              Save
            </Button>
          </div>
        </div>
      </Card>

      <HealthConnectStatusCard healthConnect={healthConnect} />

      <StepsChart history={last7DaysHistory} />

      <ActivityHistoryList entries={entries} onDelete={deleteActivity} />

      <AddActivityModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveActivity}
        defaultDate={selectedDate}
      />
    </div>
  )
}
