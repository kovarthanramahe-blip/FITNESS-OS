import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { exercises } from '@/data/exercises'
import type { Exercise } from '@/types/workout'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { ExerciseLibraryCard } from './ExerciseLibraryCard'

const MUSCLE_GROUP_OPTIONS = [
  { value: 'all', label: 'All muscle groups' },
  ...[...new Set(exercises.map((exercise) => exercise.category))].map((category) => ({
    value: category,
    label: category,
  })),
]

const EQUIPMENT_OPTIONS = [
  { value: 'all', label: 'All equipment' },
  ...[...new Set(exercises.map((exercise) => exercise.equipment))].map((equipment) => ({
    value: equipment,
    label: equipment,
  })),
]

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All difficulties' },
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
]

export function ExerciseLibrary() {
  const [query, setQuery] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('all')
  const [equipment, setEquipment] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return exercises.filter((exercise) => {
      if (normalizedQuery && !exercise.name.toLowerCase().includes(normalizedQuery)) return false
      if (muscleGroup !== 'all' && exercise.category !== muscleGroup) return false
      if (equipment !== 'all' && exercise.equipment !== equipment) return false
      if (difficulty !== 'all' && exercise.difficulty !== difficulty) return false
      return true
    })
  }, [query, muscleGroup, equipment, difficulty])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <Input
          placeholder="Search exercises…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leftIcon={<Search className="size-4" />}
          aria-label="Search exercises"
        />
        <Select
          aria-label="Filter by muscle group"
          options={MUSCLE_GROUP_OPTIONS}
          value={muscleGroup}
          onChange={(event) => setMuscleGroup(event.target.value)}
        />
        <Select
          aria-label="Filter by equipment"
          options={EQUIPMENT_OPTIONS}
          value={equipment}
          onChange={(event) => setEquipment(event.target.value)}
        />
        <Select
          aria-label="Filter by difficulty"
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No exercises match those filters" description="Try a different search term or clear a filter." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((exercise) => (
            <ExerciseLibraryCard key={exercise.id} exercise={exercise} onView={() => setSelectedExercise(exercise)} />
          ))}
        </div>
      )}

      <ExerciseDetailModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
    </div>
  )
}
