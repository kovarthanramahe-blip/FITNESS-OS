import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import type { Habit, HabitEntry } from '@/types/habits'
import { getBestStreak, getCompletionRate, getCurrentStreak } from '@/utils/habits'

export interface HabitHistorySectionProps {
  habits: Habit[]
  entries: HabitEntry[]
}

type HistoryRange = '7D' | '30D'

export function HabitHistorySection({ habits, entries }: HabitHistorySectionProps) {
  const [selectedHabitId, setSelectedHabitId] = useState(habits[0]?.id ?? '')
  const [range, setRange] = useState<HistoryRange>('7D')

  const habit = habits.find((candidate) => candidate.id === selectedHabitId) ?? habits[0]

  if (!habit) {
    return null
  }

  const habitEntries = entries.filter((entry) => entry.habitId === habit.id)
  const completionRate = getCompletionRate(habit, entries, range)
  const completedInRange = habitEntries.length
  const currentStreak = getCurrentStreak(habit, entries)
  const bestStreak = getBestStreak(habit, entries)

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Habit History</CardTitle>
      </CardHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          label="Habit"
          value={habit.id}
          onChange={(event) => setSelectedHabitId(event.target.value)}
          options={habits.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          className="max-w-xs"
        />
        <Tabs value={range} onChange={(value) => setRange(value as HistoryRange)}>
          <TabList>
            <Tab value="7D">7D</Tab>
            <Tab value="30D">30D</Tab>
          </TabList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Completion Rate" value={`${Math.round(completionRate)}`} unit="%" />
        <StatCard label="Completed" value={String(completedInRange)} unit="days total" />
        <div data-testid="habit-current-streak">
          <StatCard label="Current Streak" value={String(currentStreak)} unit={currentStreak === 1 ? 'day' : 'days'} />
        </div>
        <div data-testid="habit-best-streak">
          <StatCard label="Best Streak" value={String(bestStreak)} unit={bestStreak === 1 ? 'day' : 'days'} />
        </div>
      </div>
    </Card>
  )
}
