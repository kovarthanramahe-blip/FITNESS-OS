import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'
import { Sidebar } from '@/components/navigation/Sidebar'
import { BadgeUnlockToast } from '@/components/gamification/BadgeUnlockToast'
import { LoadingState } from '@/components/ui/LoadingState'
import { pageTransition } from '@/animations/variants'
import { useCloudSync } from '@/lib/cloudSync'
import { useGamificationSync } from '@/hooks/useGamificationSync'
import { useLocalStorageFailureToast } from '@/hooks/useLocalStorageFailureToast'
import type { Badge } from '@/types/gamification'

const BADGE_TOAST_DURATION_MS = 5000

interface QueuedBadge {
  toastId: string
  badge: Badge
}

export function AppLayout() {
  const location = useLocation()
  const [unlockedBadges, setUnlockedBadges] = useState<QueuedBadge[]>([])

  const dismissBadgeToast = useCallback((toastId: string) => {
    setUnlockedBadges((current) => current.filter((item) => item.toastId !== toastId))
  }, [])

  const handleBadgesUnlocked = useCallback(
    (badges: Badge[]) => {
      const queued = badges.map((badge) => ({ toastId: crypto.randomUUID(), badge }))
      setUnlockedBadges((current) => [...current, ...queued])
      for (const item of queued) {
        window.setTimeout(() => dismissBadgeToast(item.toastId), BADGE_TOAST_DURATION_MS)
      }
    },
    [dismissBadgeToast],
  )

  useCloudSync()
  useGamificationSync(handleBadgesUnlocked)
  useLocalStorageFailureToast()

  return (
    <div className="min-h-screen bg-bg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <Sidebar />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {/*
            No AnimatePresence/exit here on purpose: mode="wait" forced every
            navigation through a full sequential exit-then-enter (~0.5s tax,
            every time). Switching to an overlapping mode (e.g. "popLayout")
            removes that wait, but under fast successive navigations — exactly
            the case this change targets — it can leave more than one page's
            exit animation still in flight at once, so two full pages end up
            mounted simultaneously (caught by e2e/navigation.spec.ts). Keying
            the div with no exit animation avoids both problems: the outgoing
            page is removed the instant the key changes (no lingering node to
            overlap with a later navigation), while the incoming page still
            plays its own full enter transition below.
          */}
          <motion.div key={location.pathname} variants={pageTransition} initial="hidden" animate="visible">
            {/* Confines a not-yet-loaded route chunk's fallback to this content
                area only — the shell (Sidebar/BottomNavigation) above and below
                never unmounts while a lazy page is loading. */}
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
      <BottomNavigation />
      {createPortal(
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
          <AnimatePresence>
            {unlockedBadges.map((item) => (
              <BadgeUnlockToast key={item.toastId} badge={item.badge} onDismiss={() => dismissBadgeToast(item.toastId)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  )
}
