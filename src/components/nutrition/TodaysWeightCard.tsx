import { Plus, Scale } from 'lucide-react'
import { useState } from 'react'
import { MiniTrend } from '@/components/dashboard/MiniTrend'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { WeightEntryModal } from '@/components/progress/WeightEntryModal'
import { addWeightLog, useProgressStore } from '@/lib/progressStore'
import { getChangeFromPreviousEntry, getCurrentWeightLog } from '@/utils/progress'
import { getTodayDateString, parseDateOnly } from '@/utils/dateRange'

function formatLogDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TodaysWeightCard() {
  const { weightLogs, weightGoal } = useProgressStore()
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)

  const current = getCurrentWeightLog(weightLogs)
  // The latest log isn't necessarily from today — a user who last weighed in
  // three days ago shouldn't see it mislabeled "Today's Weight". See
  // getCurrentWeightLog: it returns the most recent entry, full stop.
  const isCurrentFromToday = current?.date === getTodayDateString()
  const changeFromPrevious = getChangeFromPreviousEntry(weightLogs)
  const trend = [...weightLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6)
    .map((log) => log.weightKg)

  function handleSaveEntry(entry: { date: string; weightKg: number; note?: string }) {
    addWeightLog(entry)
  }

  return (
    <Card padding="lg">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Scale className="size-4" strokeWidth={2.25} />
        </span>
        <p className="text-sm font-medium text-text-secondary">
          {!current || isCurrentFromToday ? "Today's Weight" : 'Latest Weight'}
        </p>
      </div>

      {current ? (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-bold text-text-primary">{current.weightKg.toFixed(1)} kg</p>
            <p className="mt-1 text-xs text-text-muted">
              {isCurrentFromToday ? '' : `${formatLogDate(current.date)} · `}Target {weightGoal.targetWeightKg.toFixed(1)} kg
            </p>
            {changeFromPrevious !== null && changeFromPrevious !== 0 && (
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {changeFromPrevious > 0 ? '↑' : '↓'} {Math.abs(changeFromPrevious).toFixed(1)} kg from previous entry
              </p>
            )}
          </div>
          {trend.length >= 2 && <MiniTrend values={trend} strokeClassName="stroke-accent" />}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState title="No weight logged yet" className="py-6" />
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-4 w-full justify-center"
        leftIcon={<Plus className="size-4" />}
        onClick={() => setIsEntryModalOpen(true)}
      >
        {current ? 'Log Weight' : "Log Today's Weight"}
      </Button>

      <WeightEntryModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} onSave={handleSaveEntry} />
    </Card>
  )
}
