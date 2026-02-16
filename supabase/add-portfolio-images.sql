-- Add portfolio_images to artist_applications (representative artwork photo URLs).
-- Run this in Supabase SQL Editor if the column does not exist.

alter table public.artist_applications
  add column if not exists portfolio_images text[] default '{}';

comment on column public.artist_applications.portfolio_images is 'Public URLs of up to 3 representative artwork photos (Supabase Storage).';
