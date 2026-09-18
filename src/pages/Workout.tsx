import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { ActivityPanel } from '@/components/activity/ActivityPanel'
import { ActiveWorkoutSession } from '@/components/workout/ActiveWorkoutSession'
import { CustomWorkoutBuilder } from '@/components/workout/CustomWorkoutBuilder'
import { ExerciseLibrary } from '@/components/workout/ExerciseLibrary'
import { ProgramSelector } from '@/components/workout/ProgramSelector'
import { TodayWorkoutPanel } from '@/components/workout/TodayWorkoutPanel'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { WorkoutSelectionModal } from '@/components/workout/WorkoutSelectionModal'
import { WorkoutSummaryModal } from '@/components/workout/WorkoutSummaryModal'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import { getProgramById } from '@/data/programs'
import { dismissSummary, saveCustomWorkout, selectProgram, startSession, useWorkoutStore } from '@/lib/workoutStore'
import type { Workout as WorkoutTemplate } from '@/types/workout'
import { getProgramWorkoutOptions, resolveProgramDay } from '@/utils/workout'

type WorkoutTab = 'today' | 'programs' | 'exercises' | 'history' | 'activity'

export function Workout() {
  const { activeSession, selectedProgramId, currentDayIndex, customWorkouts, history, lastCompletedSummary } =
    useWorkoutStore()

  const [tab, setTab] = useState<WorkoutTab>('today')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)

  const program = selectedProgramId ? getProgramById(selectedProgramId) : undefined
  const programDay = program ? resolveProgramDay(program, currentDayIndex) : null
  const workoutOptions = program ? getProgramWorkoutOptions(program) : []

  function handleStartTemplate(workout: WorkoutTemplate) {
    startSession(workout, program?.level ?? 'Intermediate')
  }

  /**
   * The scheduled day is only ever a *suggestion* — the user isn't forced
   * into it. When the program has more than one kind of workout day, tapping
   * "Start Workout" opens the picker instead of starting the scheduled day
   * directly; a program with just one workout day has nothing to choose
   * between, so it still starts immediately as before.
   */
  function handleStartToday() {
    if (workoutOptions.length > 1) {
      setIsSelectionOpen(true)
      return
    }
    if (programDay?.type === 'workout') handleStartTemplate(programDay.workout)
  }

  function handleSelectWorkout(workout: WorkoutTemplate) {
    setIsSelectionOpen(false)
    handleStartTemplate(workout)
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
                <Tab value="activity">Activity</Tab>
              </TabList>
            </Tabs>
          </motion.div>

          {tab === 'today' && (
            <>
              <motion.div variants={staggerItem}>
                {programDay ? (
                  <TodayWorkoutPanel programDay={programDay} onStart={handleStartToday} />
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

          {tab === 'activity' && (
            <motion.div variants={staggerItem}>
              <ActivityPanel />
            </motion.div>
          )}

          <CustomWorkoutBuilder isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} onSave={handleSaveCustomWorkout} />
          <WorkoutSelectionModal
            isOpen={isSelectionOpen}
            onClose={() => setIsSelectionOpen(false)}
            options={workoutOptions}
            onSelect={handleSelectWorkout}
            onCreateCustom={() => {
              setIsSelectionOpen(false)
              setIsBuilderOpen(true)
            }}
          />
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
