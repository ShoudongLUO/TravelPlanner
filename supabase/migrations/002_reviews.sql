-- Migration: Create itinerary_reviews table
-- NOTE: This migration must be run manually in the Supabase Dashboard → SQL Editor
-- The SQL cannot be executed automatically without Supabase project credentials

create table public.itinerary_reviews (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  actual_budget integer not null check (actual_budget > 0),
  highlights text not null default '',
  improvements text not null default '',
  visited_at date not null,
  created_at timestamptz not null default now(),
  constraint one_review_per_itinerary unique (itinerary_id)
);

alter table public.itinerary_reviews enable row level security;

create policy "users_own_reviews" on public.itinerary_reviews
  for all using (auth.uid() = user_id);
