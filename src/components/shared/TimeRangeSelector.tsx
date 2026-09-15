import type { TimeRange } from '@/types/shared'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'

export interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

const RANGES: TimeRange[] = ['7D', '30D', '3M', '6M', '1Y', 'ALL']

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <Tabs value={value} onChange={(next) => onChange(next as TimeRange)} className={className}>
      <TabList>
        {RANGES.map((range) => (
          <Tab key={range} value={range}>
            {range}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  )
}
