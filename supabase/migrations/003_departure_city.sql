-- Migration: Add departure_city to itineraries
-- NOTE: Run manually in Supabase Dashboard → SQL Editor

alter table public.itineraries
  add column if not exists departure_city text not null default '未知出发地';
