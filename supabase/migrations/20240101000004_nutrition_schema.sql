-- Fitness OS — nutrition domain
--
-- Mirrors NutritionGoal / FoodEntry from src/types/nutrition.ts. FoodEntry
-- intentionally snapshots its own macros rather than referencing a shared
-- food-library row (see the type's own comment: editing/removing a library
-- food must never rewrite history) — so there is no per-user "food items"
-- table here; the sample food library (src/data/foodLibrary.ts) is static
-- app data shipped with the client, not user data.

create table public.nutrition_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories numeric not null,
  protein_grams numeric not null,
  carbohydrate_grams numeric not null,
  fat_grams numeric not null,
  fiber_grams numeric,
  updated_at timestamptz not null default now()
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_entry_id text not null,
  food_id text not null,
  food_name text not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snacks')),
  quantity numeric not null,
  serving_unit text not null,
  calories numeric not null,
  protein numeric not null,
  carbohydrates numeric not null,
  fat numeric not null,
  fiber numeric not null,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_entry_id)
);

create index food_entries_user_date_idx on public.food_entries (user_id, log_date);

alter table public.nutrition_goals enable row level security;
alter table public.food_entries enable row level security;

create policy "nutrition_goals_select_own" on public.nutrition_goals for select using (auth.uid() = user_id);
create policy "nutrition_goals_insert_own" on public.nutrition_goals for insert with check (auth.uid() = user_id);
create policy "nutrition_goals_update_own" on public.nutrition_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nutrition_goals_delete_own" on public.nutrition_goals for delete using (auth.uid() = user_id);

create policy "food_entries_select_own" on public.food_entries for select using (auth.uid() = user_id);
create policy "food_entries_insert_own" on public.food_entries for insert with check (auth.uid() = user_id);
create policy "food_entries_update_own" on public.food_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_entries_delete_own" on public.food_entries for delete using (auth.uid() = user_id);

create trigger nutrition_goals_set_updated_at
  before update on public.nutrition_goals
  for each row execute function public.set_updated_at();
