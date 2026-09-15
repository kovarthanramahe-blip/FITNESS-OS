-- Fitness OS — child-table ownership validation
--
-- RLS's insert/update policies on workout_exercises, workout_sets, and
-- habit_entries only check the new row's own `user_id` column against
-- auth.uid() — they don't verify that the *parent* row referenced by
-- session_id / exercise_id / habit_id actually belongs to that same user.
-- Without this, an authenticated user could insert a child row whose
-- user_id is their own (satisfying RLS) but whose parent foreign key
-- points at someone else's session/exercise/habit — attaching data to a
-- record they don't own. These triggers close that gap by re-validating
-- true ownership through the parent chain on every insert/update, before
-- Part 5 turns on cloud writes for these tables.
--
-- Purely additive: new functions/triggers only, no existing data touched,
-- no columns/tables changed. Safe to apply on top of migrations 1-6.

create or replace function public.check_workout_exercise_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.workout_sessions
    where id = new.session_id and user_id = new.user_id
  ) then
    raise exception 'workout_exercises.session_id must belong to the same user_id';
  end if;
  return new;
end;
$$;

create trigger workout_exercises_check_ownership
  before insert or update on public.workout_exercises
  for each row execute function public.check_workout_exercise_ownership();

create or replace function public.check_workout_set_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.workout_exercises we
    join public.workout_sessions ws on ws.id = we.session_id
    where we.id = new.exercise_id
      and we.user_id = new.user_id
      and ws.user_id = new.user_id
  ) then
    raise exception 'workout_sets.exercise_id must belong to the same user_id';
  end if;
  return new;
end;
$$;

create trigger workout_sets_check_ownership
  before insert or update on public.workout_sets
  for each row execute function public.check_workout_set_ownership();

create or replace function public.check_habit_entry_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.habits
    where id = new.habit_id and user_id = new.user_id
  ) then
    raise exception 'habit_entries.habit_id must belong to the same user_id';
  end if;
  return new;
end;
$$;

create trigger habit_entries_check_ownership
  before insert or update on public.habit_entries
  for each row execute function public.check_habit_entry_ownership();
