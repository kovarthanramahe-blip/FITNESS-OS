import type { TimeRange } from '@/types/shared'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import { cn } from '@/utils/cn'

export interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

const RANGES: TimeRange[] = ['7D', '30D', '3M', '6M', '1Y', 'ALL']

/**
 * Centered within its container at every width, with all six options at the
 * same fixed width so the control reads as symmetric regardless of label
 * length ("30D"/"ALL" vs "7D"/"3M"/"6M"/"1Y"). On a viewport too narrow to
 * fit all six at that width, the control scrolls horizontally within its own
 * bounds (`max-w-full overflow-x-auto`) rather than widening the page or
 * clipping — the options stay reachable and the control stays centered.
 */
export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <div className={cn('flex justify-center', className)}>
      <Tabs value={value} onChange={(next) => onChange(next as TimeRange)}>
        <TabList className="max-w-full overflow-x-auto">
          {RANGES.map((range) => (
            <Tab key={range} value={range} className="w-14 shrink-0 text-center">
              {range}
            </Tab>
          ))}
        </TabList>
      </Tabs>
    </div>
  )
}
