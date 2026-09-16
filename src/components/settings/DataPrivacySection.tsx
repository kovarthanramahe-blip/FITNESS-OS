import { AlertTriangle, Download, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { resetAllFitnessData } from '@/lib/resetFitnessData'

/**
 * Settings > Data & Privacy. "Reset Fitness Data" clears every
 * user-generated record (workouts, weight/measurements, nutrition, habits/
 * water, XP/badges/challenges) for the current account back to zero — it
 * never deletes the auth account, the profile row, or the static exercise/
 * program catalogue. Gated behind an explicit confirmation dialog since
 * it can't be undone.
 *
 * When signed in with cloud sync active, this also deletes the same data
 * from Supabase (see resetFitnessData.ts) — every string below says so
 * explicitly, since "reset" silently meaning "only on this device" would
 * be misleading once a cloud copy exists on every other device too.
 */
export function DataPrivacySection() {
  const { isAuthenticated, isSupabaseConfigured } = useAuth()
  const { showToast } = useToast()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const isCloudActive = isAuthenticated && isSupabaseConfigured
  const scopeText = isCloudActive ? 'on this device and in the cloud, across all your devices' : 'on this device'

  async function handleReset() {
    setIsResetting(true)
    await resetAllFitnessData()
    setIsResetting(false)
    setIsConfirmOpen(false)
    showToast({
      title: 'Fitness data reset',
      description: `Your workouts, progress, nutrition and habits are back to zero ${scopeText}.`,
      variant: 'success',
    })
  }

  return (
    <>
      <Card padding="lg" className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle>Data &amp; Privacy</CardTitle>
        </CardHeader>

        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
              <Download className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Export data</p>
              <CardDescription>Coming soon</CardDescription>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-danger-soft text-danger">
              <RotateCcw className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Reset Fitness Data</p>
              <CardDescription>
                Clear all workouts, progress, nutrition and habits {scopeText}. Your account stays signed in.
              </CardDescription>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setIsConfirmOpen(true)}>
            Reset
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Reset Fitness Data?"
        description={`This permanently clears your workout history, personal records, weight & measurements, nutrition entries, habits, water logs, XP, badges and challenges — ${scopeText}${isCloudActive ? ', so signing in elsewhere afterward will also show zero' : ''}. Your account, profile and the exercise/program library are not affected. This cannot be undone.`}
      >
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>This action is permanent and cannot be reversed.</span>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" onClick={handleReset} isLoading={isResetting}>
            Yes, reset my data
          </Button>
          <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isResetting}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  )
}
