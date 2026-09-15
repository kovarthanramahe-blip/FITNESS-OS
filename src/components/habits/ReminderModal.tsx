import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import type { HabitCategory, HabitIconKey, HabitSchedule, Reminder } from '@/types/habits'
import { cn } from '@/utils/cn'

export interface ReminderModalSaveInput {
  name: string
  description?: string
  icon: HabitIconKey
  category: HabitCategory
  frequency: HabitSchedule
  target: number
  reminderEnabled: boolean
  reminderTime?: string
  active: boolean
}

export interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: ReminderModalSaveInput) => void
  editingReminder?: Reminder | null
  /** Defaults the category for a new reminder — 'supplements' from the supplement flow, 'custom' otherwise. */
  defaultCategory?: HabitCategory
}

type FrequencyType = HabitSchedule['type']

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const REMINDER_CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: 'supplements', label: 'Supplement' },
  { value: 'custom', label: 'Custom' },
]

function iconForCategory(category: HabitCategory): HabitIconKey {
  return category === 'supplements' ? 'pill' : 'bell'
}

/**
 * Add/edit form for supplement and custom reminders — both are stored as
 * ordinary Habit records (see types/habits.ts), so this reuses the same
 * habitStore actions as HabitModal, just with a reminder-focused field set
 * (no icon picker, target/unit, since those aren't meaningful for a
 * reminder). This is only a reminder/tracking tool: it never prescribes
 * supplements or dosages — the user defines what they want to be reminded of.
 */
export function ReminderModal({ isOpen, onClose, onSave, editingReminder, defaultCategory = 'custom' }: ReminderModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<HabitCategory>(defaultCategory)
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [timesPerWeek, setTimesPerWeek] = useState('3')
  const [reminderTime, setReminderTime] = useState('08:00')
  const [active, setActive] = useState(true)

  const openKey = isOpen ? (editingReminder?.id ?? 'new') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setTitle(editingReminder?.name ?? '')
      setDescription(editingReminder?.description ?? '')
      setCategory(editingReminder?.category ?? defaultCategory)
      setFrequencyType(editingReminder?.frequency.type ?? 'daily')
      setWeekdays(editingReminder?.frequency.type === 'weekdays' ? editingReminder.frequency.days : [1, 2, 3, 4, 5])
      setTimesPerWeek(String(editingReminder?.frequency.type === 'weekly' ? editingReminder.frequency.timesPerWeek : 3))
      setReminderTime(editingReminder?.reminderTime ?? '08:00')
      setActive(editingReminder?.active ?? true)
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()))
  }

  const timesPerWeekValue = Number(timesPerWeek)
  const canSave =
    title.trim().length > 0 &&
    reminderTime.length > 0 &&
    (frequencyType !== 'weekdays' || weekdays.length > 0) &&
    (frequencyType !== 'weekly' || (Number.isFinite(timesPerWeekValue) && timesPerWeekValue > 0))

  function handleSave() {
    if (!canSave) return
    const frequency: HabitSchedule =
      frequencyType === 'daily'
        ? { type: 'daily' }
        : frequencyType === 'weekdays'
          ? { type: 'weekdays', days: weekdays }
          : { type: 'weekly', timesPerWeek: timesPerWeekValue }

    onSave({
      name: title.trim(),
      description: description.trim() || undefined,
      icon: iconForCategory(category),
      category,
      frequency,
      target: 1,
      reminderEnabled: true,
      reminderTime,
      active,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingReminder ? 'Edit Reminder' : 'Add Reminder'}>
      <div className="flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Prepare gym bag" />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as HabitCategory)}
          options={REMINDER_CATEGORIES}
        />

        <Select
          label="Frequency"
          value={frequencyType}
          onChange={(event) => setFrequencyType(event.target.value as FrequencyType)}
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekdays', label: 'Specific days' },
            { value: 'weekly', label: 'X times per week' },
          ]}
        />

        {frequencyType === 'weekdays' && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                aria-pressed={weekdays.includes(day)}
                onClick={() => toggleWeekday(day)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-ring-on-accent',
                  weekdays.includes(day)
                    ? 'border-accent bg-accent text-text-inverse'
                    : 'border-border text-text-secondary hover:border-border-strong',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {frequencyType === 'weekly' && (
          <Input
            label="Times per week"
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            value={timesPerWeek}
            onChange={(event) => setTimesPerWeek(event.target.value)}
          />
        )}

        <Input label="Reminder time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />

        <Toggle checked={active} onChange={setActive} label="Active" description="Deactivate to pause this reminder without deleting it." />

        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          {editingReminder ? 'Save Changes' : 'Add Reminder'}
        </Button>
      </div>
    </Modal>
  )
}
