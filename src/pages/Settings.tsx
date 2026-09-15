import { motion } from 'framer-motion'
import { ChevronRight, Moon, Target, Watch } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { AccountSection } from '@/components/settings/AccountSection'
import { DataPrivacySection } from '@/components/settings/DataPrivacySection'
import { useToast } from '@/hooks/useToast'

const settingsRows = [
  { id: 'goals', label: 'Goals', description: 'Target weight, calories & macros' },
  { id: 'devices', label: 'Connected Devices', description: 'Samsung Health, Galaxy Watch (coming soon)' },
]

export function Settings() {
  const { showToast } = useToast()
  const [workoutReminders, setWorkoutReminders] = useState(true)
  const [supplementReminders, setSupplementReminders] = useState(true)
  const [units, setUnits] = useState('metric')

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your profile, preferences and integrations</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <AccountSection />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <Toggle
              checked={workoutReminders}
              onChange={setWorkoutReminders}
              label="Workout reminders"
              description="Get notified when it's time to train"
            />
            <Toggle
              checked={supplementReminders}
              onChange={setSupplementReminders}
              label="Supplement reminders"
              description="Daily nudge to take your multivitamin"
            />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Units"
              value={units}
              onChange={(event) => setUnits(event.target.value)}
              options={[
                { value: 'metric', label: 'Metric (kg, cm)' },
                { value: 'imperial', label: 'Imperial (lb, ft)' },
              ]}
            />
            <div>
              <p className="mb-1.5 block text-sm font-medium text-text-secondary">Theme</p>
              <div className="flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3.5 text-sm text-text-secondary">
                <Moon className="size-4" />
                Dark (default) — light mode coming soon
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        {settingsRows.map((row) => (
          <Card
            key={row.id}
            padding="md"
            interactive
            onClick={() => showToast({ title: `${row.label} coming soon`, variant: 'info' })}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-surface-elevated text-text-secondary">
                {row.id === 'devices' ? <Watch className="size-5" /> : <Target className="size-5" />}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{row.label}</p>
                <CardDescription>{row.description}</CardDescription>
              </div>
            </div>
            <ChevronRight className="size-4 text-text-muted" />
          </Card>
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        <DataPrivacySection />
      </motion.div>
    </motion.div>
  )
}
