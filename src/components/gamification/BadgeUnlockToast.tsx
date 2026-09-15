import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Badge } from '@/types/gamification'
import { cn } from '@/utils/cn'
import { RARITY_ICON_STYLES } from './badgeRarity'

export interface BadgeUnlockToastProps {
  badge: Badge
  onDismiss: () => void
}

/**
 * A dedicated, subtle notification for a newly-earned badge — distinct
 * from the generic XP toast so an unlock reads as a small occasion without
 * becoming a game-show popup.
 */
export function BadgeUnlockToast({ badge, onDismiss }: BadgeUnlockToastProps) {
  const Icon = badge.icon

  return (
    <motion.div
      role="status"
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-elevated p-4 shadow-[var(--shadow-elevated)]"
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', RARITY_ICON_STYLES[badge.rarity])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{'🏆'} Badge Unlocked</p>
        <p className="text-xs text-text-secondary">{badge.name}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss badge notification"
        className="text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}
