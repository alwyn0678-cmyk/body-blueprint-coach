-- ═══════════════════════════════════════════════════════════════════
-- Body Blueprint Coach — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS (Row Level Security) on all tables

-- App state table — stores the full app state as JSON per user
create table if not exists app_state (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  state       jsonb not null default '{}',
  updated_at  timestamptz default now()
);

alter table app_state enable row level security;

create policy "Users can only access their own state"
  on app_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Progress photos storage bucket
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', false)
  on conflict do nothing;

create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own photos"
  on storage.objects for select
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own photos"
  on storage.objects for delete
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════════════
-- Setup Complete!
-- 1. Create a project at https://supabase.com
-- 2. Run this SQL in the SQL Editor
-- 3. Copy your project URL + anon key to .env:
--    VITE_SUPABASE_URL=https://xyz.supabase.co
--    VITE_SUPABASE_ANON_KEY=your-anon-key
-- ═══════════════════════════════════════════════════════════════════
