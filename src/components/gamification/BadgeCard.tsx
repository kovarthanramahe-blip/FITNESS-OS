import { Lock } from 'lucide-react'
import { Badge as RarityPill } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { Badge } from '@/types/gamification'
import { cn } from '@/utils/cn'
import { BADGE_CATEGORY_LABELS, RARITY_BADGE_VARIANT, RARITY_ICON_STYLES, RARITY_LABELS } from './badgeRarity'

export interface BadgeCardProps {
  badge: Badge
  earned: boolean
  earnedAt?: string
  className?: string
}

export function BadgeCard({ badge, earned, earnedAt, className }: BadgeCardProps) {
  const Icon = badge.icon
  const rarityLabel = RARITY_LABELS[badge.rarity]
  const categoryLabel = BADGE_CATEGORY_LABELS[badge.category] ?? badge.category

  const accessibleLabel = earned
    ? `${badge.name} — earned, ${rarityLabel} ${categoryLabel} badge. ${badge.description}`
    : `${badge.name} — locked, ${rarityLabel} ${categoryLabel} badge. ${badge.requirement}`

  return (
    <Card
      padding="md"
      role="group"
      aria-label={accessibleLabel}
      data-testid={`badge-card-${badge.id}`}
      className={cn('flex flex-col items-center gap-2 text-center', !earned && 'opacity-60', className)}
    >
      <span
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          earned ? RARITY_ICON_STYLES[badge.rarity] : 'bg-surface-elevated text-text-muted',
        )}
      >
        {earned ? <Icon className="size-6" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
      </span>
      <p className="text-xs font-medium text-text-primary">{badge.name}</p>
      <p className="text-[11px] leading-tight text-text-muted">{earned ? badge.description : badge.requirement}</p>
      <RarityPill variant={RARITY_BADGE_VARIANT[badge.rarity]} className="mt-1">
        {rarityLabel}
      </RarityPill>
      {earned && earnedAt && (
        <p className="text-[10px] text-text-muted">Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      )}
    </Card>
  )
}
