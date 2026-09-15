import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Trophy, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { dismissCelebration, useWorkoutStore } from '@/lib/workoutStore'

const AUTO_DISMISS_MS = 5000

export function PRCelebrationBanner() {
  const { celebration } = useWorkoutStore()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!celebration) return
    const timeout = window.setTimeout(dismissCelebration, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timeout)
  }, [celebration])

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:top-6">
      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.id}
            role="status"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-lg)] border border-accent/40 bg-surface-elevated p-4 shadow-[var(--shadow-elevated)]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">New Personal Record</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">{celebration.exerciseName}</p>
              <p className="text-sm text-text-secondary">
                {celebration.weightKg} kg × {celebration.reps}
                {celebration.type === 'estimatedOneRepMax' && celebration.estimatedOneRepMax
                  ? ` · Est. 1RM ${celebration.estimatedOneRepMax} kg`
                  : ''}
              </p>
              <p className="mt-1 text-xs font-medium text-purple">+{celebration.xpAwarded} XP</p>
            </div>
            <button
              type="button"
              onClick={dismissCelebration}
              aria-label="Dismiss personal record notification"
              className="text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
