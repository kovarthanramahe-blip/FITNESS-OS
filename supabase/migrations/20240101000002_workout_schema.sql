-- Fitness OS — workout domain
--
-- Mirrors WorkoutHistoryEntry / WorkoutSession / WorkoutExercise / WorkoutSet
-- and PersonalRecord from src/types/workout.ts + src/types/progress.ts.
-- `client_*_id` columns carry the id the local store already generated
-- (see src/lib/workoutStore.ts `nextId`), so a future sync can upsert
-- idempotently instead of guessing whether a row already exists.

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_session_id text not null,
  name text not null,
  level text,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_minutes integer not null default 0,
  volume_kg numeric not null default 0,
  exercise_count integer not null default 0,
  set_count integer not null default 0,
  personal_record_count integer not null default 0,
  estimated_calories integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, client_session_id)
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, completed_at desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null,
  name text not null,
  muscle_group text,
  target_reps text,
  rest_seconds integer,
  position integer not null default 0
);

create index workout_exercises_session_idx on public.workout_exercises (session_id, position);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null,
  weight_kg numeric not null,
  reps integer not null,
  completed boolean not null default false,
  set_type text,
  rest_seconds integer,
  notes text
);

create index workout_sets_exercise_idx on public.workout_sets (exercise_id, set_number);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_record_id text not null,
  exercise text not null,
  exercise_id text,
  weight_kg numeric not null,
  reps integer not null,
  record_date timestamptz not null,
  record_type text,
  estimated_one_rep_max numeric,
  created_at timestamptz not null default now(),
  unique (user_id, client_record_id)
);

create index personal_records_user_exercise_idx on public.personal_records (user_id, exercise_id);

alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;

create policy "workout_sessions_select_own" on public.workout_sessions for select using (auth.uid() = user_id);
create policy "workout_sessions_insert_own" on public.workout_sessions for insert with check (auth.uid() = user_id);
create policy "workout_sessions_update_own" on public.workout_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_sessions_delete_own" on public.workout_sessions for delete using (auth.uid() = user_id);

create policy "workout_exercises_select_own" on public.workout_exercises for select using (auth.uid() = user_id);
create policy "workout_exercises_insert_own" on public.workout_exercises for insert with check (auth.uid() = user_id);
create policy "workout_exercises_update_own" on public.workout_exercises for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_exercises_delete_own" on public.workout_exercises for delete using (auth.uid() = user_id);

create policy "workout_sets_select_own" on public.workout_sets for select using (auth.uid() = user_id);
create policy "workout_sets_insert_own" on public.workout_sets for insert with check (auth.uid() = user_id);
create policy "workout_sets_update_own" on public.workout_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_sets_delete_own" on public.workout_sets for delete using (auth.uid() = user_id);

create policy "personal_records_select_own" on public.personal_records for select using (auth.uid() = user_id);
create policy "personal_records_insert_own" on public.personal_records for insert with check (auth.uid() = user_id);
create policy "personal_records_update_own" on public.personal_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "personal_records_delete_own" on public.personal_records for delete using (auth.uid() = user_id);
