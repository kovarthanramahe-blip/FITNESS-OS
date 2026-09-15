import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { HabitCard } from '@/components/habits/HabitCard'
import { HabitHistorySection } from '@/components/habits/HabitHistorySection'
import { HabitInsights } from '@/components/habits/HabitInsights'
import { HabitModal } from '@/components/habits/HabitModal'
import type { HabitModalSaveInput } from '@/components/habits/HabitModal'
import { HabitsSummary } from '@/components/habits/HabitsSummary'
import { ReminderCard } from '@/components/habits/ReminderCard'
import { ReminderModal } from '@/components/habits/ReminderModal'
import type { ReminderModalSaveInput } from '@/components/habits/ReminderModal'
import { WaterGoalModal } from '@/components/habits/WaterGoalModal'
import { WaterTracker } from '@/components/habits/WaterTracker'
import {
  addHabit,
  addWaterLog,
  completeHabit,
  deleteHabit,
  editHabit,
  removeLatestWaterLog,
  setWaterGoal,
  toggleHabitActive,
  uncompleteHabit,
  useHabitStore,
} from '@/lib/habitStore'
import type { Habit, Reminder } from '@/types/habits'
import { getTodaysHabitsSummary } from '@/utils/habits'

const REMINDER_CATEGORIES = new Set(['supplements', 'custom'])

export function Habits() {
  const { habits, entries, waterLogs, waterGoal } = useHabitStore()

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [isWaterGoalModalOpen, setIsWaterGoalModalOpen] = useState(false)

  const regularHabits = habits.filter((habit) => !REMINDER_CATEGORIES.has(habit.category))
  const reminders = habits.filter((habit) => REMINDER_CATEGORIES.has(habit.category))
  const summary = getTodaysHabitsSummary(habits, entries)

  function handleAddHabit() {
    setEditingHabit(null)
    setIsHabitModalOpen(true)
  }

  function handleEditHabit(habit: Habit) {
    setEditingHabit(habit)
    setIsHabitModalOpen(true)
  }

  function handleSaveHabit(input: HabitModalSaveInput) {
    if (editingHabit) {
      editHabit(editingHabit.id, input)
    } else {
      addHabit(input)
    }
  }

  function handleDeleteHabit(habit: Habit) {
    if (window.confirm(`Delete "${habit.name}"? This also removes its completion history.`)) {
      deleteHabit(habit.id)
    }
  }

  function handleAddReminder() {
    setEditingReminder(null)
    setIsReminderModalOpen(true)
  }

  function handleEditReminder(reminder: Reminder) {
    setEditingReminder(reminder)
    setIsReminderModalOpen(true)
  }

  function handleSaveReminder(input: ReminderModalSaveInput) {
    if (editingReminder) {
      editHabit(editingReminder.id, input)
    } else {
      addHabit(input)
    }
  }

  function handleDeleteReminder(reminder: Reminder) {
    if (window.confirm(`Delete "${reminder.name}"?`)) {
      deleteHabit(reminder.id)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Habits</h1>
        <p className="mt-1 text-sm text-text-secondary">Track daily habits, hydration, and reminders</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <HabitsSummary summary={summary} />
      </motion.div>

      <motion.div variants={staggerItem}>
        <WaterTracker
          logs={waterLogs}
          goal={waterGoal}
          onAdd={(amountMl) => addWaterLog(amountMl)}
          onUndo={() => removeLatestWaterLog()}
          onEditGoal={() => setIsWaterGoalModalOpen(true)}
        />
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Habits</h2>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={handleAddHabit}>
            Add Habit
          </Button>
        </div>
        {regularHabits.length === 0 ? (
          <EmptyState title="No habits yet" description="Add a habit to start tracking it." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {regularHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                entries={entries}
                onComplete={(h) => completeHabit(h.id)}
                onUncomplete={(h) => uncompleteHabit(h.id)}
                onEdit={handleEditHabit}
                onToggleActive={(h) => toggleHabitActive(h.id)}
                onDelete={handleDeleteHabit}
              />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Reminders</h2>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={handleAddReminder}>
            Add Reminder
          </Button>
        </div>
        {reminders.length === 0 ? (
          <EmptyState title="No reminders yet" description="Add a supplement or custom reminder." />
        ) : (
          <div className="flex flex-col gap-3">
            {reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                entries={entries}
                onComplete={(r) => completeHabit(r.id)}
                onUncomplete={(r) => uncompleteHabit(r.id)}
                onEdit={handleEditReminder}
                onToggleActive={(r) => toggleHabitActive(r.id)}
                onDelete={handleDeleteReminder}
              />
            ))}
          </div>
        )}
      </motion.div>

      {regularHabits.length > 0 && (
        <motion.div variants={staggerItem}>
          <HabitHistorySection habits={regularHabits} entries={entries} />
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <HabitInsights summary={summary} waterLogs={waterLogs} waterGoal={waterGoal} />
      </motion.div>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSave={handleSaveReminder}
        editingReminder={editingReminder}
      />
      <WaterGoalModal
        isOpen={isWaterGoalModalOpen}
        onClose={() => setIsWaterGoalModalOpen(false)}
        goal={waterGoal}
        onSave={setWaterGoal}
      />
    </motion.div>
  )
}
