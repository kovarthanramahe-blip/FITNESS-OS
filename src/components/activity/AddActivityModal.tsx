import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ACTIVITY_TYPE_LABELS, getMetOptionsForActivity } from '@/data/activityCatalogue'
import type { ActivityType } from '@/types/activity'
import { getTodayDateString } from '@/utils/dateRange'

export interface AddActivitySaveInput {
  activityType: ActivityType
  metOptionId: string
  durationMinutes: number
  date: string
  notes?: string
}

export interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (input: AddActivitySaveInput) => void
  defaultDate?: string
}

const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]

export function AddActivityModal({ isOpen, onClose, onSave, defaultDate }: AddActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType>('walking')
  const [metOptionId, setMetOptionId] = useState(getMetOptionsForActivity('walking')[0]!.id)
  const [duration, setDuration] = useState('30')
  const [date, setDate] = useState(defaultDate ?? getTodayDateString())
  const [notes, setNotes] = useState('')

  // Resets the form each time the modal opens, without an Effect — see FoodEntryModal for the same pattern.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setActivityType('walking')
      setMetOptionId(getMetOptionsForActivity('walking')[0]!.id)
      setDuration('30')
      setDate(defaultDate ?? getTodayDateString())
      setNotes('')
    }
  }

  function handleActivityTypeChange(value: ActivityType) {
    setActivityType(value)
    setMetOptionId(getMetOptionsForActivity(value)[0]!.id)
  }

  const durationValue = Number(duration)
  const canSave = date.length > 0 && Number.isFinite(durationValue) && durationValue > 0

  function handleSave() {
    if (!canSave) return
    onSave({ activityType, metOptionId, durationMinutes: durationValue, date, notes: notes.trim() || undefined })
    onClose()
  }

  const metOptions = getMetOptionsForActivity(activityType)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Activity">
      <div className="flex flex-col gap-4">
        <Select
          label="Activity"
          value={activityType}
          onChange={(event) => handleActivityTypeChange(event.target.value as ActivityType)}
          options={ACTIVITY_TYPES.map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] }))}
        />

        <Select
          label="Intensity"
          value={metOptionId}
          onChange={(event) => setMetOptionId(event.target.value)}
          options={metOptions.map((option) => ({ value: option.id, label: option.label }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duration (minutes)"
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
          <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Felt strong today"
        />

        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          Add Activity
        </Button>
      </div>
    </Modal>
  )
}
