-- Add collector / pending_collector roles and collector_bio, verified for PUMWI collector flow.
-- Run in Supabase SQL Editor if your profiles.role check or columns don't support these yet.

-- Allow new role values (drop old check, add new check)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'artist', 'admin', 'collector', 'pending_collector'));

-- Add optional columns for collector application
alter table public.profiles add column if not exists verified boolean default false;
alter table public.profiles add column if not exists collector_bio text;
