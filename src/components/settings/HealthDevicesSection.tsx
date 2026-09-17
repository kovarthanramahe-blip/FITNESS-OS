import { Activity, CheckCircle2, Footprints, RefreshCw, Watch } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useHealthConnect } from '@/hooks/useHealthConnect'
import { getDayOfWeek, getTodayDateString } from '@/utils/dateRange'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Settings > Health & Devices. Phase 8A's availability/permission state
 * (steps, exercise) plus Phase 8B.1's real step data — today's total and a
 * 7-day list — shown once connected. Still no exercise data or any sync to
 * Supabase. See docs/health-connect-setup.md.
 *
 * Every state below is reachable without a physical Health Connect
 * install: `status` starts `null` (loading), then settles into
 * 'unavailable' | 'update_required' | 'available' — the component never
 * throws or blocks the rest of Settings regardless of which one it lands
 * on, matching the requirement that the rest of Fitness OS keeps working.
 */
export function HealthDevicesSection() {
  const {
    status,
    permissions,
    loading,
    error,
    isConnected,
    connect,
    refresh,
    openSettings,
    steps,
    stepsLoading,
    stepsError,
    refreshSteps,
  } = useHealthConnect()
  const today = getTodayDateString()
  const todaySteps = steps?.days.find((day) => day.date === today)?.steps

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>Health &amp; Devices</CardTitle>
        <CardDescription className="mt-1">
          Fitness OS uses Health Connect to access activity and workout information that you choose to share. You
          can change these permissions at any time.
        </CardDescription>
      </CardHeader>

      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
            <Watch className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">Health Connect</p>
            <CardDescription>{statusDescription(status, loading, isConnected)}</CardDescription>
          </div>
        </div>
        {status === 'available' && (
          <Badge variant={isConnected ? 'success' : 'warning'}>
            {isConnected ? 'Connected' : 'Action needed'}
          </Badge>
        )}
      </div>

      {error && (
        <p className="rounded-[var(--radius-md)] border border-dashed border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {status === 'available' && (
        <div className="flex flex-col gap-2">
          <PermissionRow icon={Footprints} label="Steps" granted={permissions.steps} />
          <PermissionRow icon={Activity} label="Exercise" granted={permissions.exercise} />
        </div>
      )}

      {isConnected && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Today&apos;s Steps</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              {stepsLoading && !steps ? '—' : (todaySteps ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Last 7 Days</p>
            {stepsError && <p className="text-xs text-danger">{stepsError}</p>}
            {!stepsError && steps?.error && (
              <p className="text-xs text-text-muted">We couldn&apos;t read step data right now.</p>
            )}
            {!stepsError && !steps?.error && steps && steps.days.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {steps.days.map((day) => (
                  <li key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{WEEKDAY_LABELS[getDayOfWeek(day.date)]}</span>
                    <span className="font-medium text-text-primary">{day.steps.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status === 'available' && !isConnected && (
          <Button size="sm" onClick={() => void connect()} isLoading={loading}>
            Grant Access
          </Button>
        )}
        {status === 'available' && isConnected && (
          <>
            <Button variant="secondary" size="sm" onClick={() => void openSettings()}>
              Manage Permissions
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="size-3.5" />}
              onClick={() => {
                void refresh()
                void refreshSteps()
              }}
              isLoading={loading || stepsLoading}
            >
              Sync Now
            </Button>
          </>
        )}
        {status === 'update_required' && (
          <Button variant="secondary" size="sm" onClick={() => void openSettings()}>
            Open Health Connect
          </Button>
        )}
      </div>
    </Card>
  )
}

function statusDescription(
  status: ReturnType<typeof useHealthConnect>['status'],
  loading: boolean,
  isConnected: boolean,
): string {
  if (status === null && loading) return 'Checking availability…'
  if (status === 'update_required') return 'Needs an update before Fitness OS can connect.'
  if (status === 'available') return isConnected ? 'Connected' : 'Permission not granted.'
  return 'Not available on this device.'
}

function PermissionRow({
  icon: Icon,
  label,
  granted,
}: {
  icon: typeof Footprints
  label: string
  granted: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-text-muted" aria-hidden="true" />
      <span className="text-text-primary">{label}</span>
      {granted ? (
        <span className="inline-flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Permission granted
        </span>
      ) : (
        <span className="text-xs text-text-muted">Permission not granted</span>
      )}
    </div>
  )
}
