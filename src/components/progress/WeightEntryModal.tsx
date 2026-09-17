import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { WeightLog } from '@/types/progress'
import { getTodayDateString } from '@/utils/dateRange'

export interface WeightEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: { date: string; weightKg: number; note?: string }) => void
  /** When set, the modal edits this entry instead of creating a new one. */
  editingLog?: WeightLog | null
}

export function WeightEntryModal({ isOpen, onClose, onSave, editingLog }: WeightEntryModalProps) {
  const [date, setDate] = useState(getTodayDateString())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')

  // Resets the form fields whenever the modal opens (fresh, or for a
  // different entry), without an Effect: recomputed during render and
  // compared to the last render's key, per React's guidance for adjusting
  // state in response to a prop change.
  const openKey = isOpen ? (editingLog?.id ?? 'new') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setDate(editingLog?.date ?? getTodayDateString())
      setWeight(editingLog ? String(editingLog.weightKg) : '')
      setNote(editingLog?.note ?? '')
    }
  }

  const weightValue = Number(weight)
  const canSave = date.length > 0 && Number.isFinite(weightValue) && weightValue > 0

  function handleSave() {
    if (!canSave) return
    onSave({ date, weightKg: weightValue, note: note.trim() || undefined })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingLog ? 'Edit Weight Entry' : 'Add Weight Entry'}>
      <div className="flex flex-col gap-4">
        <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getTodayDateString()} />
        <Input
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          placeholder="e.g. 72.4"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
        <Input
          label="Note (optional)"
          placeholder="e.g. Morning, after workout"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          {editingLog ? 'Save Changes' : 'Add Entry'}
        </Button>
      </div>
    </Modal>
  )
}
