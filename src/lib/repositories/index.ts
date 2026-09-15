import { createCloudRepositories } from '@/lib/repositories/cloud'
import { localRepositories } from '@/lib/repositories/local'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { Repositories } from '@/lib/repositories/types'

export type {
  GamificationRepository,
  HabitRepository,
  NutritionRepository,
  ProgressRepository,
  Repositories,
  WorkoutRepository,
} from '@/lib/repositories/types'

/**
 * The one place that decides local vs. cloud. Signed out (or Supabase not
 * configured) always gets the local repositories — this is what keeps
 * Fitness OS fully functional with zero cloud setup. Signed in gets the
 * cloud repositories, ready for Phase 8 to actually start reading through
 * them; no existing page does yet (see docs/SYNC_STRATEGY.md).
 */
export function getRepositories(userId: string | null): Repositories {
  if (userId && isSupabaseConfigured) {
    return createCloudRepositories(userId)
  }
  return localRepositories
}
