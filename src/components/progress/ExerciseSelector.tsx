import { getExerciseById } from '@/data/exercises'
import { Select } from '@/components/ui/Select'

export interface ExerciseSelectorProps {
  exerciseIds: string[]
  value: string
  onChange: (exerciseId: string) => void
  className?: string
}

export function ExerciseSelector({ exerciseIds, value, onChange, className }: ExerciseSelectorProps) {
  return (
    <Select
      label="Exercise"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={exerciseIds.map((id) => ({ value: id, label: getExerciseById(id)?.name ?? id }))}
      className={className}
    />
  )
}
