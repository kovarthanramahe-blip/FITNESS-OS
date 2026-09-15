-- Fitness OS — progress domain
--
-- Mirrors WeightLog / BodyMeasurement from src/types/progress.ts.
-- WeightGoal is a single derived-from-usage preference, not a log —
-- it's stored inline as a `weight_goals` singleton-per-user table (one
-- row, upserted), the same pattern used for nutrition/water goals.

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_log_id text not null,
  log_date date not null,
  weight_kg numeric not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, client_log_id)
);

create index weight_logs_user_date_idx on public.weight_logs (user_id, log_date desc);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_measurement_id text not null,
  measurement_type text not null,
  log_date date not null,
  value numeric not null,
  unit text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, client_measurement_id)
);

create index body_measurements_user_type_idx on public.body_measurements (user_id, measurement_type, log_date desc);

create table public.weight_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starting_weight_kg numeric not null,
  target_weight_kg numeric not null,
  start_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.weight_logs enable row level security;
alter table public.body_measurements enable row level security;
alter table public.weight_goals enable row level security;

create policy "weight_logs_select_own" on public.weight_logs for select using (auth.uid() = user_id);
create policy "weight_logs_insert_own" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "weight_logs_update_own" on public.weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_logs_delete_own" on public.weight_logs for delete using (auth.uid() = user_id);

create policy "body_measurements_select_own" on public.body_measurements for select using (auth.uid() = user_id);
create policy "body_measurements_insert_own" on public.body_measurements for insert with check (auth.uid() = user_id);
create policy "body_measurements_update_own" on public.body_measurements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body_measurements_delete_own" on public.body_measurements for delete using (auth.uid() = user_id);

create policy "weight_goals_select_own" on public.weight_goals for select using (auth.uid() = user_id);
create policy "weight_goals_insert_own" on public.weight_goals for insert with check (auth.uid() = user_id);
create policy "weight_goals_update_own" on public.weight_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_goals_delete_own" on public.weight_goals for delete using (auth.uid() = user_id);

create trigger weight_goals_set_updated_at
  before update on public.weight_goals
  for each row execute function public.set_updated_at();
