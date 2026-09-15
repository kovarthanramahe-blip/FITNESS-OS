import { Trophy } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { PersonalRecord } from '@/types/progress'
import { cn } from '@/utils/cn'

export interface PersonalRecordsCardProps {
  records: PersonalRecord[]
  className?: string
}

export function PersonalRecordsCard({ records, className }: PersonalRecordsCardProps) {
  return (
    <Card padding="lg" className={cn('flex h-full flex-col', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-accent" />
          <CardTitle>Recent Personal Records</CardTitle>
        </div>
      </CardHeader>
      {records.length === 0 ? (
        <p className="text-sm text-text-muted">No personal records yet — set one in your next workout.</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border">
          {records.map((record) => (
            <li key={record.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{record.exercise}</p>
                <p className="text-xs text-text-muted">{record.date}</p>
              </div>
              <p className="shrink-0 font-display text-sm font-semibold text-text-primary">
                {record.weightKg} kg <span className="font-normal text-text-muted">× {record.reps}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
