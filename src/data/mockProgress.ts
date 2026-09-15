import type { PersonalRecord } from '@/types/progress'

/**
 * Dashboard-facing "recent PRs" snapshot. Independent from the live,
 * growing `personalRecords` tracked in the workout store — that one backs
 * the Progress page's strength analytics and PR detection.
 */
export const mockPersonalRecords: PersonalRecord[] = [
  { id: 'pr-1', exercise: 'Bench Press', weightKg: 72.5, reps: 3, date: 'Sep 8' },
  { id: 'pr-2', exercise: 'Back Squat', weightKg: 112.5, reps: 2, date: 'Sep 5' },
  { id: 'pr-3', exercise: 'Deadlift', weightKg: 147.5, reps: 1, date: 'Sep 1' },
  { id: 'pr-4', exercise: 'Overhead Press', weightKg: 42.5, reps: 4, date: 'Aug 28' },
]
