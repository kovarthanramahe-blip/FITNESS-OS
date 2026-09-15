import { Target } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ChallengeProgress } from '@/types/gamification'
import { ChallengeCard } from './ChallengeCard'

export interface ChallengeListProps {
  title: string
  challenges: ChallengeProgress[]
  emptyMessage?: string
}

export function ChallengeList({ title, challenges, emptyMessage = 'No challenges right now.' }: ChallengeListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      {challenges.length === 0 ? (
        <EmptyState icon={Target} title={emptyMessage} />
      ) : (
        challenges.map((progress) => <ChallengeCard key={progress.instanceId} progress={progress} />)
      )}
    </div>
  )
}
