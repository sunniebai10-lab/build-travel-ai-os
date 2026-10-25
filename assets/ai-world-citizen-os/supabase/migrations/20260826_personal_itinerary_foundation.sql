-- AI World Citizen OS
-- Phase 6B: Personal Itinerary Foundation
--
-- Creates a private overlay for user-created and user-overridden itinerary items.
-- It intentionally leaves public.itinerary and existing activity_state rows unchanged.

begin;

create extension if not exists "pgcrypto";

create table if not exists public.user_itinerary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  source_itinerary_id uuid references public.itinerary(id) on delete restrict,
  date date not null,
  time time,
  city text not null,
  title text not null,
  location text,
  category text,
  note text,
  source text not null default 'spontaneous',
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_itinerary_source_check check (
    (source = 'spontaneous' and source_itinerary_id is null)
    or (source = 'override' and source_itinerary_id is not null)
  ),
  constraint user_itinerary_status_check check (
    status in ('planned', 'cancelled')
  ),
  constraint user_itinerary_category_check check (
    category is null
    or category in ('History', 'Culture', 'Food', 'Nature', 'Experience', 'Transport', 'Planning')
  )
);

create unique index if not exists user_itinerary_override_source_unique
  on public.user_itinerary(user_id, source_itinerary_id)
  where source_itinerary_id is not null;

create index if not exists user_itinerary_user_trip_date_idx
  on public.user_itinerary(user_id, trip_id, date, time);

create index if not exists user_itinerary_trip_status_idx
  on public.user_itinerary(trip_id, status);

alter table public.user_itinerary enable row level security;

drop policy if exists "user_itinerary_select_own" on public.user_itinerary;
create policy "user_itinerary_select_own"
on public.user_itinerary for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_itinerary_insert_own" on public.user_itinerary;
create policy "user_itinerary_insert_own"
on public.user_itinerary for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    source_itinerary_id is null
    or exists (
      select 1
      from public.itinerary base
      where base.id = user_itinerary.source_itinerary_id
        and base.trip_id = user_itinerary.trip_id
    )
  )
);

drop policy if exists "user_itinerary_update_own" on public.user_itinerary;
create policy "user_itinerary_update_own"
on public.user_itinerary for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    source_itinerary_id is null
    or exists (
      select 1
      from public.itinerary base
      where base.id = user_itinerary.source_itinerary_id
        and base.trip_id = user_itinerary.trip_id
    )
  )
);

drop policy if exists "user_itinerary_delete_own" on public.user_itinerary;
create policy "user_itinerary_delete_own"
on public.user_itinerary for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete
on table public.user_itinerary
to authenticated;

commit;
