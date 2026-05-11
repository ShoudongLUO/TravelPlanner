-- Migration: Add travelers column to itineraries
-- Run in Supabase Dashboard → SQL Editor

alter table public.itineraries
  add column if not exists travelers integer not null default 2
  check (travelers > 0 and travelers <= 10);
