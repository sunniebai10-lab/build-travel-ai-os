create extension if not exists "pgcrypto";

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  budget numeric not null default 0,
  currency text not null default 'USD',
  cover_image text,
  created_at timestamptz not null default now()
);

create table if not exists countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  flag text,
  history jsonb not null default '[]'::jsonb,
  culture jsonb not null default '[]'::jsonb,
  taboo jsonb not null default '[]'::jsonb,
  language text,
  created_at timestamptz not null default now()
);

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references countries(id) on delete set null,
  name text not null,
  latitude numeric,
  longitude numeric,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists itinerary (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  date date not null,
  city text not null,
  time time,
  title text not null,
  location text,
  ai_note text,
  category text check (category is null or category in ('History', 'Culture', 'Food', 'Nature', 'Experience', 'Transport', 'Planning')),
  created_at timestamptz not null default now()
);

create table if not exists accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  city text not null,
  hotel_name text not null,
  address text,
  price numeric,
  currency text,
  check_in date,
  check_out date,
  created_at timestamptz not null default now()
);

create table if not exists transportation (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  "from" text not null,
  "to" text not null,
  type text not null,
  date date,
  time time,
  price numeric,
  currency text,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  date date not null,
  category text not null,
  amount numeric not null,
  currency text not null,
  location text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists culture (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  category text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists journal (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  city text not null,
  photo text,
  photos jsonb not null default '[]'::jsonb,
  sentence text,
  story text,
  created_at timestamptz not null default now()
);

-- Shared planning data is readable, not writable, by browser clients.
grant select on table public.trips, public.countries, public.cities,
  public.itinerary, public.accommodations, public.transportation, public.culture
to anon, authenticated;
