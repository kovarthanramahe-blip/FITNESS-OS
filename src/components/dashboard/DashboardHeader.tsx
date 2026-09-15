import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import type { DashboardHeaderData } from '@/types/dashboard'
import { formatFriendlyDate } from '@/utils/format'

export interface DashboardHeaderProps {
  header: DashboardHeaderData
  /** Injectable for tests; defaults to `new Date()`. */
  now?: Date
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHeader({ header, now = new Date() }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{formatFriendlyDate(now)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
          {getGreeting(now.getHours())}, {header.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Ready for today's session?</p>
      </div>
      <Link
        to="/settings"
        aria-label="Open your profile settings"
        className="shrink-0 rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={header.fullName} src={header.avatarUrl} size="lg" />
      </Link>
    </div>
  )
}
