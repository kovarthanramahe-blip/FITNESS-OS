import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { LoadingState } from '@/components/ui/LoadingState'

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Workout = lazy(() => import('@/pages/Workout').then((m) => ({ default: m.Workout })))
const Nutrition = lazy(() => import('@/pages/Nutrition').then((m) => ({ default: m.Nutrition })))
const Progress = lazy(() => import('@/pages/Progress').then((m) => ({ default: m.Progress })))
const Habits = lazy(() => import('@/pages/Habits').then((m) => ({ default: m.Habits })))
const Achievements = lazy(() =>
  import('@/pages/Achievements').then((m) => ({ default: m.Achievements })),
)
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))

function App() {
  return (
    <Suspense fallback={<LoadingState fullHeight />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
