-- Add pending_artist role for Admin Applications unified query.
-- Run after add-collector-role-and-fields.sql (which already has pending_collector).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'artist', 'admin', 'collector', 'pending_collector', 'pending_artist'));
