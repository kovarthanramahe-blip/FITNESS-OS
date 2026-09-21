import { useCallback, useEffect, useRef, useState } from 'react'
import { setStepsForDate } from '@/lib/activityStore'
import {
  getStatus,
  getSteps,
  HealthConnectError,
  openSettings as openHealthConnectSettings,
  requestPermissions,
} from '@/lib/healthConnect'
import type { HealthConnectConnectionStatus } from '@/lib/healthConnect'
import { addDaysToDateString, getTodayDateString } from '@/utils/dateRange'

const HISTORY_WINDOW_DAYS = 7

export interface UseHealthConnectResult {
  /** 'checking' only during the very first status check on mount. */
  status: HealthConnectConnectionStatus | 'checking'
  hasHistoryPermission: boolean
  /** True while requesting permissions or refreshing steps — for disabling the relevant buttons, not a full-page spinner. */
  isBusy: boolean
  /** Set when the status/permission check itself fails unexpectedly. Distinct from stepsError. */
  error: string | null
  /** Set when a steps read fails — distinct from a legitimate 0, which clears this and updates the store normally. */
  stepsError: string | null
  /** Opens Health Connect's permission dialog, then re-syncs steps if it results in access. */
  connect: () => Promise<void>
  /** Re-checks connection status and, if connected, re-reads steps — the explicit "Refresh Steps" action, and what runs once on mount. */
  refresh: () => Promise<void>
  openSettings: () => Promise<void>
}

/**
 * Drives the Activity screen's Health Connect section. Runs one status
 * check (and, if already connected, one steps read) on mount — "the
 * screen becoming active," since ActivityPanel unmounts/remounts on every
 * tab switch — and otherwise only syncs when the user explicitly asks via
 * `connect()`/`refresh()`. No polling, no background sync.
 *
 * Writes step totals into the existing `activityStore` (`DailySteps`,
 * `source: 'health-connect'`) rather than holding its own copy — the
 * store's own upsert-by-date behavior in `setStepsForDate` is what makes a
 * repeated refresh replace the same date's imported value instead of
 * duplicating it. This hook never touches `ActivityEntry` records.
 */
export function useHealthConnect(): UseHealthConnectResult {
  const [status, setStatus] = useState<HealthConnectConnectionStatus | 'checking'>('checking')
  const [hasHistoryPermission, setHasHistoryPermission] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stepsError, setStepsError] = useState<string | null>(null)

  // Guards against a slow response from a check that started before the
  // component unmounted (e.g. switching Workout tabs mid-request) from
  // still calling setState afterward.
  const isMountedRef = useRef(true)
  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const syncSteps = useCallback(async () => {
    const today = getTodayDateString()
    const startDate = addDaysToDateString(today, -(HISTORY_WINDOW_DAYS - 1))
    try {
      const dailyTotals = await getSteps(startDate, today)
      if (!isMountedRef.current) return
      for (const { date, steps } of dailyTotals) {
        setStepsForDate(steps, date, 'health-connect')
      }
      setStepsError(null)
    } catch (err) {
      if (!isMountedRef.current) return
      // Deliberately never writes a 0 into the store on failure — an
      // unreadable day must never be indistinguishable from a real zero.
      setStepsError(err instanceof HealthConnectError ? err.message : 'Unable to read Health Connect step data.')
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await getStatus()
      if (!isMountedRef.current) return
      setStatus(result.connection)
      setHasHistoryPermission(result.hasHistoryPermission)
      if (result.connection === 'connected') {
        await syncSteps()
      }
    } catch (err) {
      if (!isMountedRef.current) return
      setStatus('unavailable')
      setError(err instanceof HealthConnectError ? err.message : 'Unable to check Health Connect status.')
    } finally {
      if (isMountedRef.current) setIsBusy(false)
    }
  }, [syncSteps])

  const connect = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      const result = await requestPermissions()
      if (!isMountedRef.current) return
      setStatus(result.connection)
      setHasHistoryPermission(result.hasHistoryPermission)
      if (result.connection === 'connected') {
        await syncSteps()
      }
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof HealthConnectError ? err.message : 'Unable to request Health Connect permissions.')
    } finally {
      if (isMountedRef.current) setIsBusy(false)
    }
  }, [syncSteps])

  const openSettings = useCallback(async () => {
    await openHealthConnectSettings()
  }, [])

  // Runs once when the Activity screen mounts — see the function doc comment.
  useEffect(() => {
    void refresh()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, hasHistoryPermission, isBusy, error, stepsError, connect, refresh, openSettings }
}
