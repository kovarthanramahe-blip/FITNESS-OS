import { AlertTriangle, ExternalLink, HeartPulse, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { UseHealthConnectResult } from '@/hooks/useHealthConnect'
import { cn } from '@/utils/cn'

const STATUS_LABEL: Record<UseHealthConnectResult['status'], string> = {
  checking: 'Checking…',
  connected: 'Connected',
  'permission-required': 'Permission required',
  unavailable: 'Unavailable',
}

const STATUS_DOT_CLASS: Record<UseHealthConnectResult['status'], string> = {
  checking: 'bg-text-muted',
  connected: 'bg-success',
  'permission-required': 'bg-warning',
  unavailable: 'bg-danger',
}

export interface HealthConnectStatusCardProps {
  healthConnect: UseHealthConnectResult
}

/**
 * Galaxy Watch -> Samsung Health -> Health Connect -> here: this card only
 * ever talks to Health Connect, never Samsung Health directly, and only
 * ever labels data "Health Connect" — never "Samsung Health," since the
 * app has no way to know which original source contributed to an
 * aggregated total.
 */
export function HealthConnectStatusCard({ healthConnect }: HealthConnectStatusCardProps) {
  const { status, isBusy, error, stepsError, connect, refresh, openSettings } = healthConnect

  return (
    <Card padding="lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HeartPulse className="size-5 text-secondary" />
          <CardTitle>Health Connect</CardTitle>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <span className={cn('size-2 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </CardHeader>

      {status === 'unavailable' && (
        <p className="text-sm text-text-secondary">
          Health Connect isn&rsquo;t available on this device. Install or enable it, then connect Samsung Health to
          it, to bring in steps from your phone or Galaxy Watch.
        </p>
      )}
      {status === 'permission-required' && (
        <p className="text-sm text-text-secondary">
          Health Connect is installed, but Fitness OS hasn&rsquo;t been granted permission to read your steps yet.
        </p>
      )}
      {status === 'connected' && (
        <p className="text-sm text-text-secondary">Reading steps from Health Connect (source: Health Connect).</p>
      )}

      {(error || stepsError) && (
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error ?? stepsError}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== 'connected' && status !== 'unavailable' && (
          <Button variant="primary" size="sm" onClick={() => void connect()} disabled={isBusy}>
            Connect Health Connect
          </Button>
        )}
        {status === 'connected' && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="size-3.5" />}
            onClick={() => void refresh()}
            disabled={isBusy}
          >
            Refresh Steps
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ExternalLink className="size-3.5" />}
          onClick={() => void openSettings()}
          disabled={status === 'unavailable'}
        >
          Open Health Connect Settings
        </Button>
      </div>
    </Card>
  )
}
