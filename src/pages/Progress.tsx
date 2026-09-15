import { motion } from 'framer-motion'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import { MeasurementsTab } from '@/components/progress/MeasurementsTab'
import { StrengthTab } from '@/components/progress/StrengthTab'
import { WeightTab } from '@/components/progress/WeightTab'
import { WorkoutsTab } from '@/components/progress/WorkoutsTab'

type ProgressSection = 'weight' | 'measurements' | 'strength' | 'workouts'

const SECTIONS: { value: ProgressSection; label: string }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'measurements', label: 'Measurements' },
  { value: 'strength', label: 'Strength' },
  { value: 'workouts', label: 'Workouts' },
]

export function Progress() {
  const [section, setSection] = useState<ProgressSection>('weight')

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Progress</h1>
        <p className="mt-1 text-sm text-text-secondary">Your body composition and training trends</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Tabs value={section} onChange={(value) => setSection(value as ProgressSection)}>
          <TabList>
            {SECTIONS.map((tab) => (
              <Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </motion.div>

      <motion.div variants={staggerItem}>
        {section === 'weight' && <WeightTab />}
        {section === 'measurements' && <MeasurementsTab />}
        {section === 'strength' && <StrengthTab />}
        {section === 'workouts' && <WorkoutsTab />}
      </motion.div>
    </motion.div>
  )
}
