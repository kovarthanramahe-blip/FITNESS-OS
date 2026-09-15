import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface LoadingStateProps {
  label?: string
  className?: string
  fullHeight?: boolean
}

export function LoadingState({ label = 'Loading…', className, fullHeight = false }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-text-secondary',
        fullHeight && 'min-h-[50vh]',
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[var(--radius-sm)] bg-surface-elevated', className)} />
}
