import { workoutPrograms } from '@/data/programs'
import { ProgramCard } from './ProgramCard'

export interface ProgramSelectorProps {
  selectedProgramId: string | null
  onSelectProgram: (programId: string) => void
}

export function ProgramSelector({ selectedProgramId, onSelectProgram }: ProgramSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {workoutPrograms.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          isSelected={program.id === selectedProgramId}
          onSelect={() => onSelectProgram(program.id)}
        />
      ))}
    </div>
  )
}
