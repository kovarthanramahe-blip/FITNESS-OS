import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { addMeasurement, deleteMeasurement, updateMeasurement, useProgressStore } from '@/lib/progressStore'
import { DEFAULT_MEASUREMENT_TYPES } from '@/types/progress'
import type { BodyMeasurement, MeasurementUnit } from '@/types/progress'
import { BodyMeasurementsList } from './BodyMeasurementsList'
import { MeasurementChart } from './MeasurementChart'
import { MeasurementEntryModal } from './MeasurementEntryModal'
import { MeasurementTypeSelector } from './MeasurementTypeSelector'

export function MeasurementsTab() {
  const { measurements } = useProgressStore()

  const knownTypes = [...new Set(measurements.map((measurement) => measurement.type))]
  const availableTypes = [...new Set([...DEFAULT_MEASUREMENT_TYPES, ...knownTypes])]

  const [selectedType, setSelectedType] = useState<string>(availableTypes[0] ?? '')
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null)

  const effectiveType = availableTypes.includes(selectedType) ? selectedType : (availableTypes[0] ?? '')
  const filtered = measurements.filter((measurement) => measurement.type === effectiveType)
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1] ?? null
  const earliest = sorted[0] ?? null
  const changeValue = latest && earliest && latest.id !== earliest.id ? latest.value - earliest.value : null

  function handleAddClick() {
    setEditingMeasurement(null)
    setIsEntryModalOpen(true)
  }

  function handleEdit(measurement: BodyMeasurement) {
    setEditingMeasurement(measurement)
    setIsEntryModalOpen(true)
  }

  function handleDelete(measurement: BodyMeasurement) {
    if (window.confirm(`Delete the ${measurement.value} ${measurement.unit} ${measurement.type} entry from ${measurement.date}?`)) {
      deleteMeasurement(measurement.id)
    }
  }

  function handleSaveEntry(entry: { type: string; date: string; value: number; unit: MeasurementUnit; note?: string }) {
    if (editingMeasurement) {
      updateMeasurement(editingMeasurement.id, entry)
    } else {
      addMeasurement(entry)
    }
    setSelectedType(entry.type)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Latest" value={latest ? String(latest.value) : '—'} unit={latest ? latest.unit : undefined} />
        <StatCard
          label="Change"
          value={changeValue === null ? 'Not enough data' : `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(1)}`}
          unit={changeValue === null ? undefined : latest?.unit}
        />
        <StatCard label="Entries Logged" value={String(filtered.length)} />
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>{effectiveType || 'Body Measurements'}</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={handleAddClick}>
            Add Measurement
          </Button>
        </CardHeader>
        <MeasurementTypeSelector types={availableTypes} value={effectiveType} onChange={setSelectedType} className="mb-4" />
        <MeasurementChart measurements={filtered} />
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <BodyMeasurementsList measurements={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      </Card>

      <MeasurementEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        editingMeasurement={editingMeasurement}
        knownTypes={knownTypes}
        defaultType={effectiveType}
      />
    </div>
  )
}
