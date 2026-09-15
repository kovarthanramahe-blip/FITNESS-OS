import type { Badge } from '@/types/gamification'
import { EmptyState } from '@/components/ui/EmptyState'
import { BadgeCard } from './BadgeCard'

export interface BadgeGridItem {
  badge: Badge
  earned: boolean
  earnedAt?: string
}

export interface BadgeGridProps {
  items: BadgeGridItem[]
  emptyMessage?: string
}

export function BadgeGrid({ items, emptyMessage = 'No badges match this filter yet.' }: BadgeGridProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ badge, earned, earnedAt }) => (
        <BadgeCard key={badge.id} badge={badge} earned={earned} earnedAt={earnedAt} />
      ))}
    </div>
  )
}
