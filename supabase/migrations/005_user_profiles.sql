-- Migration: Create user_profiles table
-- NOTE: Run manually in Supabase Dashboard → SQL Editor

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  travel_styles text[] not null default '{}',
  pace text not null default '',
  budget_style text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users_own_profile" on public.user_profiles
  for all using (auth.uid() = user_id);
