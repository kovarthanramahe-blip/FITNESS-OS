import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { HABIT_ICON_KEYS } from '@/data/habitIcons'
import { HABIT_CATEGORIES, HABIT_CATEGORY_LABELS } from '@/types/habits'
import type { Habit, HabitCategory, HabitIconKey, HabitSchedule } from '@/types/habits'
import { cn } from '@/utils/cn'

export interface HabitModalSaveInput {
  name: string
  description?: string
  icon: HabitIconKey
  category: HabitCategory
  frequency: HabitSchedule
  target: number
  unit?: string
  reminderEnabled: boolean
  reminderTime?: string
  active: boolean
}

export interface HabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: HabitModalSaveInput) => void
  editingHabit?: Habit | null
  title?: string
  saveLabel?: string
}

type FrequencyType = HabitSchedule['type']

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ICON_LABELS: Record<HabitIconKey, string> = {
  droplets: 'Droplet',
  pill: 'Pill',
  dumbbell: 'Dumbbell',
  footprints: 'Footprints',
  moon: 'Moon',
  beef: 'Protein',
  utensils: 'Utensils',
  heart: 'Heart',
  sparkles: 'Sparkles',
  bell: 'Bell',
  checkCircle: 'Checklist',
}

export function HabitModal({ isOpen, onClose, onSave, editingHabit, title, saveLabel }: HabitModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<HabitIconKey>('sparkles')
  const [category, setCategory] = useState<HabitCategory>('wellness')
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [timesPerWeek, setTimesPerWeek] = useState('3')
  const [target, setTarget] = useState('1')
  const [unit, setUnit] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [active, setActive] = useState(true)

  const openKey = isOpen ? (editingHabit?.id ?? 'new') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setName(editingHabit?.name ?? '')
      setDescription(editingHabit?.description ?? '')
      setIcon(editingHabit?.icon ?? 'sparkles')
      setCategory(editingHabit?.category ?? 'wellness')
      setFrequencyType(editingHabit?.frequency.type ?? 'daily')
      setWeekdays(editingHabit?.frequency.type === 'weekdays' ? editingHabit.frequency.days : [1, 2, 3, 4, 5])
      setTimesPerWeek(String(editingHabit?.frequency.type === 'weekly' ? editingHabit.frequency.timesPerWeek : 3))
      setTarget(String(editingHabit?.target ?? 1))
      setUnit(editingHabit?.unit ?? '')
      setReminderEnabled(editingHabit?.reminderEnabled ?? false)
      setReminderTime(editingHabit?.reminderTime ?? '08:00')
      setActive(editingHabit?.active ?? true)
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()))
  }

  const targetValue = Number(target)
  const timesPerWeekValue = Number(timesPerWeek)
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(targetValue) &&
    targetValue > 0 &&
    (frequencyType !== 'weekdays' || weekdays.length > 0) &&
    (frequencyType !== 'weekly' || (Number.isFinite(timesPerWeekValue) && timesPerWeekValue > 0)) &&
    (!reminderEnabled || reminderTime.length > 0)

  function handleSave() {
    if (!canSave) return
    const frequency: HabitSchedule =
      frequencyType === 'daily'
        ? { type: 'daily' }
        : frequencyType === 'weekdays'
          ? { type: 'weekdays', days: weekdays }
          : { type: 'weekly', timesPerWeek: timesPerWeekValue }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      category,
      frequency,
      target: targetValue,
      unit: unit.trim() || undefined,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      active,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? (editingHabit ? 'Edit Habit' : 'Add Habit')}>
      <div className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Stretch" />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Icon"
            value={icon}
            onChange={(event) => setIcon(event.target.value as HabitIconKey)}
            options={HABIT_ICON_KEYS.map((key) => ({ value: key, label: ICON_LABELS[key] }))}
          />
          <Select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value as HabitCategory)}
            options={HABIT_CATEGORIES.map((value) => ({ value, label: HABIT_CATEGORY_LABELS[value] }))}
          />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Input label="Unit (optional)" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="e.g. steps" />
        </div>

        <Toggle checked={reminderEnabled} onChange={setReminderEnabled} label="Reminder" description="Show a reminder time on this habit's card." />
        {reminderEnabled && (
          <Input
            label="Reminder time"
            type="time"
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
          />
        )}

        <Toggle checked={active} onChange={setActive} label="Active" description="Inactive habits are paused, not deleted." />

        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          {saveLabel ?? (editingHabit ? 'Save Changes' : 'Add Habit')}
        </Button>
      </div>
    </Modal>
  )
}
