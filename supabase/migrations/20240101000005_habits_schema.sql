-- Fitness OS — habits, reminders and water domain
--
-- Mirrors Habit / HabitEntry / WaterGoal / WaterLog from src/types/habits.ts.
-- Reminders are NOT a separate table: the app's own type says it plainly
-- ("A distinct name for reminder-oriented UI/vocabulary over the same
-- underlying Habit shape" — `type Reminder = Habit`), so a reminder is just
-- a habit row with category 'supplements' or 'custom'.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_habit_id text not null,
  name text not null,
  description text,
  icon text not null,
  category text not null,
  frequency_type text not null check (frequency_type in ('daily', 'weekdays', 'weekly')),
  frequency_days integer[],
  frequency_times_per_week integer,
  target numeric not null,
  unit text,
  reminder_enabled boolean not null default false,
  reminder_time text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_habit_id)
);

create index habits_user_active_idx on public.habits (user_id, active);

create table public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  client_entry_id text not null,
  log_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, client_entry_id),
  unique (habit_id, log_date)
);

create index habit_entries_user_date_idx on public.habit_entries (user_id, log_date);

create table public.water_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_ml numeric not null,
  preferred_unit text not null check (preferred_unit in ('ml', 'l')),
  updated_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_log_id text not null,
  log_date date not null,
  amount_ml numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_log_id)
);

create index water_logs_user_date_idx on public.water_logs (user_id, log_date);

alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.water_goals enable row level security;
alter table public.water_logs enable row level security;

create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

create policy "habit_entries_select_own" on public.habit_entries for select using (auth.uid() = user_id);
create policy "habit_entries_insert_own" on public.habit_entries for insert with check (auth.uid() = user_id);
create policy "habit_entries_update_own" on public.habit_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_entries_delete_own" on public.habit_entries for delete using (auth.uid() = user_id);

create policy "water_goals_select_own" on public.water_goals for select using (auth.uid() = user_id);
create policy "water_goals_insert_own" on public.water_goals for insert with check (auth.uid() = user_id);
create policy "water_goals_update_own" on public.water_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_goals_delete_own" on public.water_goals for delete using (auth.uid() = user_id);

create policy "water_logs_select_own" on public.water_logs for select using (auth.uid() = user_id);
create policy "water_logs_insert_own" on public.water_logs for insert with check (auth.uid() = user_id);
create policy "water_logs_update_own" on public.water_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_logs_delete_own" on public.water_logs for delete using (auth.uid() = user_id);

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create trigger water_goals_set_updated_at
  before update on public.water_goals
  for each row execute function public.set_updated_at();
