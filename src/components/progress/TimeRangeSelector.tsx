import type { ProgressTimeRange } from '@/types/progress'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'

export interface TimeRangeSelectorProps {
  value: ProgressTimeRange
  onChange: (range: ProgressTimeRange) => void
  className?: string
}

const RANGES: ProgressTimeRange[] = ['7D', '30D', '3M', '6M', '1Y', 'ALL']

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <Tabs value={value} onChange={(next) => onChange(next as ProgressTimeRange)} className={className}>
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
