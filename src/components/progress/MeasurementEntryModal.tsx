import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { DEFAULT_MEASUREMENT_TYPES } from '@/types/progress'
import type { BodyMeasurement, MeasurementUnit } from '@/types/progress'
import { getTodayDateString } from '@/utils/dateRange'

export interface MeasurementEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: { type: string; date: string; value: number; unit: MeasurementUnit; note?: string }) => void
  editingMeasurement?: BodyMeasurement | null
  /** Types already in use, so previously added custom types stay selectable. */
  knownTypes: string[]
  defaultType?: string
}

const CUSTOM_OPTION = '__custom__'

export function MeasurementEntryModal({
  isOpen,
  onClose,
  onSave,
  editingMeasurement,
  knownTypes,
  defaultType,
}: MeasurementEntryModalProps) {
  const typeOptions = [...new Set([...DEFAULT_MEASUREMENT_TYPES, ...knownTypes])]

  const [type, setType] = useState(defaultType ?? typeOptions[0] ?? '')
  const [customType, setCustomType] = useState('')
  const [date, setDate] = useState(getTodayDateString())
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<MeasurementUnit>('cm')
  const [note, setNote] = useState('')

  // Resets the form fields whenever the modal opens (fresh, or for a
  // different entry), without an Effect: see WeightEntryModal for the same
  // pattern.
  const openKey = isOpen ? (editingMeasurement?.id ?? 'new') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      const initialType = editingMeasurement?.type ?? defaultType ?? typeOptions[0] ?? ''
      const isKnown = typeOptions.includes(initialType)
      setType(isKnown ? initialType : CUSTOM_OPTION)
      setCustomType(isKnown ? '' : initialType)
      setDate(editingMeasurement?.date ?? getTodayDateString())
      setValue(editingMeasurement ? String(editingMeasurement.value) : '')
      setUnit(editingMeasurement?.unit ?? 'cm')
      setNote(editingMeasurement?.note ?? '')
    }
  }

  const resolvedType = type === CUSTOM_OPTION ? customType.trim() : type
  const numericValue = Number(value)
  const canSave = resolvedType.length > 0 && date.length > 0 && Number.isFinite(numericValue) && numericValue > 0

  function handleSave() {
    if (!canSave) return
    onSave({ type: resolvedType, date, value: numericValue, unit, note: note.trim() || undefined })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingMeasurement ? 'Edit Measurement' : 'Add Measurement'}>
      <div className="flex flex-col gap-4">
        <Select
          label="Measurement"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[...typeOptions.map((option) => ({ value: option, label: option })), { value: CUSTOM_OPTION, label: 'Custom…' }]}
        />
        {type === CUSTOM_OPTION && (
          <Input
            label="Custom measurement name"
            value={customType}
            onChange={(event) => setCustomType(event.target.value)}
            placeholder="e.g. Neck"
          />
        )}
        <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getTodayDateString()} />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Value"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Select
            label="Unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value as MeasurementUnit)}
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'in', label: 'in' },
            ]}
          />
        </div>
        <Input label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          {editingMeasurement ? 'Save Changes' : 'Add Measurement'}
        </Button>
      </div>
    </Modal>
  )
}
