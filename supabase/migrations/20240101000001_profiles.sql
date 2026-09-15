-- Fitness OS — profiles
--
-- One row per authenticated user, keyed by the Supabase Auth user id.
-- Never duplicates authentication credentials (password, provider tokens,
-- etc.) — those stay in Supabase's own auth.users table.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

-- A user may read and update only their own profile row. There is
-- deliberately no insert or delete policy for regular users: rows are
-- created exclusively by the trigger below (running as the function
-- owner, which bypasses RLS) and removed automatically via the
-- `references auth.users(id) on delete cascade` above when the auth user
-- is deleted. Client-side profile creation is never relied on.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Generic "touch updated_at" trigger, reused by every table below that has
-- an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatic profile creation. `security definer` runs this with the
-- function owner's privileges (bypassing RLS), so a fresh profile row is
-- guaranteed to exist the moment a Supabase Auth user is created —
-- this is the safe, Supabase-documented approach, not something the
-- client can be relied on (or trusted) to do itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
