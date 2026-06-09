-- =============================================================================
-- Derma-A — full Supabase baseline (run once in SQL Editor)
-- Creates: profiles, scans, daily_tips_broadcast, storage buckets, RLS.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS where needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles — one row per auth user (matches app: supabaseAuth + admin)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text default '' not null,
  last_name text default '' not null,
  sex text not null default 'other' check (sex in ('male', 'female', 'other')),
  location text default '' not null,
  contact text default '' not null,
  role text not null default 'patient' check (role in ('patient', 'admin')),
  avatar_url text,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Align older `profiles` tables with the app (no-op if columns already exist).
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists contact text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz;

-- -----------------------------------------------------------------------------
-- 2. scans — cloud scan rows (matches supabaseScans.ts)
-- -----------------------------------------------------------------------------
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  infection_type text,
  severity_level text not null check (severity_level in ('low', 'medium', 'high')),
  confidence_score double precision,
  recommendations text,
  scanned_at timestamptz not null default now()
);

-- If `scans` already existed from an older schema, CREATE TABLE is skipped — add missing columns.
alter table public.scans add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.scans add column if not exists image_url text;
alter table public.scans add column if not exists infection_type text;
alter table public.scans add column if not exists severity_level text;
alter table public.scans add column if not exists confidence_score double precision;
alter table public.scans add column if not exists recommendations text;
alter table public.scans add column if not exists scanned_at timestamptz default now();

-- Existing rows: if the column was just added as NULL (no default on add), fill timestamps.
update public.scans set scanned_at = now() where scanned_at is null;

alter table public.scans alter column scanned_at set default now();

create index if not exists scans_user_id_idx on public.scans (user_id);
create index if not exists scans_scanned_at_idx on public.scans (scanned_at desc);

-- -----------------------------------------------------------------------------
-- 3. daily_tips_broadcast — admin “conseils du jour” for all patients
-- -----------------------------------------------------------------------------
create table if not exists public.daily_tips_broadcast (
  id int primary key check (id = 1),
  tip1_title text not null default '',
  tip1_body text not null default '',
  tip2_title text not null default '',
  tip2_body text not null default '',
  updated_at timestamptz default now()
);

insert into public.daily_tips_broadcast (id, tip1_title, tip1_body, tip2_title, tip2_body)
values (1, '', '', '', '')
on conflict (id) do nothing;
-- -----------------------------------------------------------------------------
-- 3b. Helper: admin check without recursive RLS on `profiles`
-- -----------------------------------------------------------------------------
create or replace function public.is_admin(_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(_uid, auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security — profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 5. Row Level Security — scans
-- -----------------------------------------------------------------------------
alter table public.scans enable row level security;

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own"
  on public.scans for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "scans_select_admin" on public.scans;
create policy "scans_select_admin"
  on public.scans for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own"
  on public.scans for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "scans_delete_own" on public.scans;
create policy "scans_delete_own"
  on public.scans for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. Row Level Security — daily_tips_broadcast
-- -----------------------------------------------------------------------------
alter table public.daily_tips_broadcast enable row level security;

drop policy if exists "daily_tips_broadcast_select" on public.daily_tips_broadcast;
create policy "daily_tips_broadcast_select"
  on public.daily_tips_broadcast for select
  to authenticated
  using (true);

drop policy if exists "daily_tips_broadcast_all_admin" on public.daily_tips_broadcast;
create policy "daily_tips_broadcast_all_admin"
  on public.daily_tips_broadcast for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 7. Storage buckets (public URLs used by the app)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('skin-scans', 'skin-scans', true)
on conflict (id) do nothing;

-- storage.objects policies — avatars
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- storage.objects policies — skin-scans (path: {user_id}/…)
drop policy if exists "skin_scans_public_read" on storage.objects;
create policy "skin_scans_public_read"
  on storage.objects for select
  using (bucket_id = 'skin-scans');

drop policy if exists "skin_scans_insert_own" on storage.objects;
create policy "skin_scans_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'skin-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- After this script succeeds, promote an admin (replace UUID + use real id):
--
--   update public.profiles set role = 'admin' where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
-- If that user has no profile row yet, insert one first:
--
--   insert into public.profiles (id, first_name, last_name, sex, location, contact, role)
--   values ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Admin', '', 'other', '', '', 'admin')
--   on conflict (id) do update set role = excluded.role;
-- =============================================================================
