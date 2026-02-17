-- Add latitude and longitude to profiles (for distance-based "Artists Near Me")
alter table public.profiles add column if not exists lat double precision;
alter table public.profiles add column if not exists lng double precision;
comment on column public.profiles.lat is 'Latitude of activity location (from Google Places)';
comment on column public.profiles.lng is 'Longitude of activity location (from Google Places)';
