-- Migration: Create itineraries table
-- NOTE: This migration must be run manually in the Supabase Dashboard → SQL Editor
-- The SQL cannot be executed automatically without Supabase project credentials

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  start_date date not null,
  days integer not null check (days > 0 and days <= 30),
  budget integer not null check (budget > 0),
  content jsonb not null default '{}',
  youtube_videos jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index itineraries_user_id_idx on public.itineraries(user_id);
create index itineraries_destination_idx on public.itineraries(destination);

alter table public.itineraries enable row level security;

create policy "users_own_itineraries" on public.itineraries
  for all using (auth.uid() = user_id);
