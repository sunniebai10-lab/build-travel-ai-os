-- AI World Citizen OS
-- Phase 3.14 Cloud Persistence Foundation
--
-- Safe draft. Review before running in Supabase.
-- Goal: prepare multi-user cloud persistence for Journal, Wallet, and Activity state.

create extension if not exists "pgcrypto";

-- 1. User ownership columns

alter table expenses
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table journal
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table journal
  add column if not exists trip_id uuid references trips(id) on delete cascade;

-- 2. Activity completion state

create table if not exists activity_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  activity_id text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  journal_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_id)
);

create index if not exists expenses_user_id_idx on expenses(user_id);
create index if not exists expenses_trip_user_idx on expenses(trip_id, user_id);
create index if not exists journal_user_id_idx on journal(user_id);
create index if not exists journal_trip_user_idx on journal(trip_id, user_id);
create index if not exists activity_state_user_id_idx on activity_state(user_id);
create index if not exists activity_state_trip_id_idx on activity_state(trip_id);

-- 3. Storage bucket for journal photos

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', false)
on conflict (id) do nothing;

-- 4. RLS

alter table expenses enable row level security;
alter table journal enable row level security;
alter table activity_state enable row level security;

-- Keep imported/shared seed rows readable while user-owned writes are introduced.
-- Later production hardening can remove the user_id is null read path.

drop policy if exists "expenses_select_own_or_seed" on expenses;
create policy "expenses_select_own_or_seed"
on expenses for select
to authenticated
using (user_id = auth.uid() or user_id is null);

drop policy if exists "expenses_insert_own" on expenses;
create policy "expenses_insert_own"
on expenses for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "expenses_update_own" on expenses;
create policy "expenses_update_own"
on expenses for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "expenses_delete_own" on expenses;
create policy "expenses_delete_own"
on expenses for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "journal_select_own" on journal;
create policy "journal_select_own"
on journal for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "journal_insert_own" on journal;
create policy "journal_insert_own"
on journal for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "journal_update_own" on journal;
create policy "journal_update_own"
on journal for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "journal_delete_own" on journal;
create policy "journal_delete_own"
on journal for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "activity_state_select_own" on activity_state;
create policy "activity_state_select_own"
on activity_state for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "activity_state_upsert_own" on activity_state;
create policy "activity_state_upsert_own"
on activity_state for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "activity_state_update_own" on activity_state;
create policy "activity_state_update_own"
on activity_state for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- RLS policies restrict rows; these grants provide the authenticated role
-- only the table operations currently required by the client persistence flows.
grant select, insert, update on table public.journal to authenticated;
grant select, insert on table public.expenses to authenticated;
grant select, insert, update on table public.activity_state to authenticated;

-- Storage RLS. Object path convention:
-- {user_id}/{journal_id}/{filename}

drop policy if exists "journal_photos_select_own" on storage.objects;
create policy "journal_photos_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "journal_photos_insert_own" on storage.objects;
create policy "journal_photos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "journal_photos_update_own" on storage.objects;
create policy "journal_photos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "journal_photos_delete_own" on storage.objects;
create policy "journal_photos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
