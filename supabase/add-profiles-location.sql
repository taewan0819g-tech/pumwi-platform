-- Add city and country to profiles (for activity location / "Artists Near Me")
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists country text;
comment on column public.profiles.city is 'Activity location: city (e.g. Seoul, Paris)';
comment on column public.profiles.country is 'Activity location: country code (kr, jp, usa, etc.) or custom name when Other';
