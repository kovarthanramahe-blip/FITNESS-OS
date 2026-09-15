import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { exercises, getExerciseById } from '@/data/exercises'
import type { Workout, WorkoutExerciseTemplate } from '@/types/workout'

export interface CustomWorkoutBuilderProps {
  isOpen: boolean
  onClose: () => void
  onSave: (workout: Workout) => void
}

const EXERCISE_OPTIONS = exercises.map((exercise) => ({ value: exercise.id, label: exercise.name }))

export function CustomWorkoutBuilder({ isOpen, onClose, onSave }: CustomWorkoutBuilderProps) {
  const [name, setName] = useState('')
  const [items, setItems] = useState<WorkoutExerciseTemplate[]>([])
  const [pickerExerciseId, setPickerExerciseId] = useState(exercises[0]?.id ?? '')
  const nameId = useId()

  function reset() {
    setName('')
    setItems([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  function addExercise() {
    const exercise = getExerciseById(pickerExerciseId)
    if (!exercise) return
    setItems((current) => [...current, { exerciseId: exercise.id, sets: exercise.defaultSets, reps: exercise.defaultReps }])
  }

  function removeExercise(index: number) {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      if (!moved) return current
      next.splice(target, 0, moved)
      return next
    })
  }

  function updateItem(index: number, patch: Partial<WorkoutExerciseTemplate>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleSave() {
    if (!name.trim() || items.length === 0) return
    const estimatedMinutes = items.reduce((total, item) => total + item.sets * 3, 0)
    onSave({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim(),
      exercises: items,
      estimatedMinutes,
    })
    reset()
  }

  const canSave = name.trim().length > 0 && items.length > 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Custom Workout" className="sm:max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor={nameId} className="mb-1.5 block text-sm font-medium text-text-secondary">
            Workout name
          </label>
          <Input id={nameId} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Arm Day" />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Add exercise"
              options={EXERCISE_OPTIONS}
              value={pickerExerciseId}
              onChange={(event) => setPickerExerciseId(event.target.value)}
            />
          </div>
          <Button variant="secondary" size="md" onClick={addExercise} leftIcon={<Plus className="size-4" />}>
            Add
          </Button>
        </div>

        {items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => {
              const exercise = getExerciseById(item.exerciseId)
              return (
                <li
                  key={`${item.exerciseId}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {exercise?.name ?? item.exerciseId}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={item.sets}
                    onChange={(event) => updateItem(index, { sets: Number(event.target.value) || 1 })}
                    aria-label={`Sets for ${exercise?.name ?? item.exerciseId}`}
                    className="h-9 w-14 rounded-[var(--radius-sm)] border border-border bg-surface-elevated text-center text-sm text-text-primary [appearance:textfield] focus:border-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-text-muted">sets</span>
                  <input
                    type="text"
                    value={item.reps}
                    onChange={(event) => updateItem(index, { reps: event.target.value })}
                    aria-label={`Reps for ${exercise?.name ?? item.exerciseId}`}
                    className="h-9 w-16 rounded-[var(--radius-sm)] border border-border bg-surface-elevated text-center text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-text-muted">reps</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${exercise?.name ?? item.exerciseId} up`}
                      onClick={() => moveExercise(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${exercise?.name ?? item.exerciseId} down`}
                      onClick={() => moveExercise(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${exercise?.name ?? item.exerciseId}`}
                      onClick={() => removeExercise(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          Save Workout
        </Button>
      </div>
    </Modal>
  )
}
