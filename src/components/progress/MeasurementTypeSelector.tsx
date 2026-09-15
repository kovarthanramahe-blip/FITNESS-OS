import { Select } from '@/components/ui/Select'

export interface MeasurementTypeSelectorProps {
  types: string[]
  value: string
  onChange: (type: string) => void
  className?: string
}

export function MeasurementTypeSelector({ types, value, onChange, className }: MeasurementTypeSelectorProps) {
  return (
    <Select
      label="Measurement"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={types.map((type) => ({ value: type, label: type }))}
      className={className}
    />
  )
}
