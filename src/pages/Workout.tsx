import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { ActiveWorkoutSession } from '@/components/workout/ActiveWorkoutSession'
import { CustomWorkoutBuilder } from '@/components/workout/CustomWorkoutBuilder'
import { ExerciseLibrary } from '@/components/workout/ExerciseLibrary'
import { ProgramSelector } from '@/components/workout/ProgramSelector'
import { TodayWorkoutPanel } from '@/components/workout/TodayWorkoutPanel'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { WorkoutSummaryModal } from '@/components/workout/WorkoutSummaryModal'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import { getProgramById } from '@/data/programs'
import { dismissSummary, saveCustomWorkout, selectProgram, startSession, useWorkoutStore } from '@/lib/workoutStore'
import type { Workout as WorkoutTemplate } from '@/types/workout'
import { resolveProgramDay } from '@/utils/workout'

type WorkoutTab = 'today' | 'programs' | 'exercises' | 'history'

export function Workout() {
  const { activeSession, selectedProgramId, currentDayIndex, customWorkouts, history, lastCompletedSummary } =
    useWorkoutStore()

  const [tab, setTab] = useState<WorkoutTab>('today')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  const program = selectedProgramId ? getProgramById(selectedProgramId) : undefined
  const programDay = program ? resolveProgramDay(program, currentDayIndex) : null

  function handleStartTemplate(workout: WorkoutTemplate) {
    startSession(workout, program?.level ?? 'Intermediate')
  }

  function handleSaveCustomWorkout(workout: WorkoutTemplate) {
    saveCustomWorkout(workout)
    setIsBuilderOpen(false)
  }

  return (
    <>
      {activeSession ? (
        <ActiveWorkoutSession key={activeSession.id} session={activeSession} />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
          <motion.div variants={staggerItem}>
            <h1 className="font-display text-2xl font-bold text-text-primary">Workout</h1>
            <p className="mt-1 text-sm text-text-secondary">Plan, train, and track your progress over time</p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Tabs value={tab} onChange={(value) => setTab(value as WorkoutTab)}>
              <TabList>
                <Tab value="today">Today</Tab>
                <Tab value="programs">Programs</Tab>
                <Tab value="exercises">Exercises</Tab>
                <Tab value="history">History</Tab>
              </TabList>
            </Tabs>
          </motion.div>

          {tab === 'today' && (
            <>
              <motion.div variants={staggerItem}>
                {programDay ? (
                  <TodayWorkoutPanel
                    programDay={programDay}
                    onStart={() => programDay.type === 'workout' && handleStartTemplate(programDay.workout)}
                  />
                ) : (
                  <Card elevated padding="lg" className="text-center text-sm text-text-secondary">
                    Choose a program to see today&rsquo;s workout.
                  </Card>
                )}
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card padding="lg">
                  <CardHeader>
                    <CardTitle>Custom Workouts</CardTitle>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="size-4" />}
                      onClick={() => setIsBuilderOpen(true)}
                    >
                      Create
                    </Button>
                  </CardHeader>
                  {customWorkouts.length === 0 ? (
                    <p className="text-sm text-text-secondary">Build your own workout from any exercise in the library.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {customWorkouts.map((workout) => (
                        <li key={workout.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{workout.name}</p>
                            <p className="text-xs text-text-muted">
                              {workout.exercises.length} exercises · ~{workout.estimatedMinutes} min
                            </p>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => handleStartTemplate(workout)}>
                            Start
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </motion.div>
            </>
          )}

          {tab === 'programs' && (
            <motion.div variants={staggerItem}>
              <ProgramSelector selectedProgramId={selectedProgramId} onSelectProgram={selectProgram} />
            </motion.div>
          )}

          {tab === 'exercises' && (
            <motion.div variants={staggerItem}>
              <ExerciseLibrary />
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div variants={staggerItem}>
              <WorkoutHistoryList history={history} />
            </motion.div>
          )}

          <CustomWorkoutBuilder isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} onSave={handleSaveCustomWorkout} />
        </motion.div>
      )}

      {lastCompletedSummary && (
        <WorkoutSummaryModal
          isOpen
          onClose={dismissSummary}
          entry={lastCompletedSummary.historyEntry}
          newPersonalRecords={lastCompletedSummary.newPersonalRecords}
        />
      )}
    </>
  )
}
