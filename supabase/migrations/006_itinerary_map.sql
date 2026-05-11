-- Migration: Add map-related columns to itineraries
-- NOTE: Run manually in Supabase Dashboard → SQL Editor

alter table public.itineraries
  add column if not exists destination_lat double precision,
  add column if not exists destination_lng double precision,
  add column if not exists destination_country text,
  add column if not exists visited boolean not null default false;
