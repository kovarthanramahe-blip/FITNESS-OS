import { useEffect, useState } from 'react'
import { getElapsedSeconds } from '@/utils/workout'

/**
 * Ticking elapsed-seconds counter derived from a fixed start time, so it
 * survives re-renders without resetting — the value is always recomputed
 * from `startedAt`, never accumulated locally. Mount this under a component
 * keyed by session id if `startedAt` can change, so the initial value is
 * always fresh.
 */
export function useElapsedSeconds(startedAt: string, completedAt?: string): number {
  const [seconds, setSeconds] = useState(() => getElapsedSeconds(startedAt, new Date(), completedAt))

  useEffect(() => {
    if (completedAt) return
    const interval = window.setInterval(() => {
      setSeconds(getElapsedSeconds(startedAt))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [startedAt, completedAt])

  return seconds
}
