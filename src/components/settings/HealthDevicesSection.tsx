import { Activity, CheckCircle2, Footprints, RefreshCw, Watch } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useHealthConnect } from '@/hooks/useHealthConnect'

/**
 * Settings > Health & Devices (Phase 8A foundation). Reflects Health
 * Connect availability and the two Phase 8A permissions (steps, exercise)
 * only — no step count, exercise data, or any sync happens here yet. See
 * docs/health-connect-setup.md.
 *
 * Every state below is reachable without a physical Health Connect
 * install: `status` starts `null` (loading), then settles into
 * 'unavailable' | 'update_required' | 'available' — the component never
 * throws or blocks the rest of Settings regardless of which one it lands
 * on, matching the requirement that the rest of Fitness OS keeps working.
 */
export function HealthDevicesSection() {
  const { status, permissions, loading, error, isConnected, connect, refresh, openSettings } = useHealthConnect()

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
              onClick={() => void refresh()}
              isLoading={loading}
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
