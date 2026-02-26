-- application_status on profiles for admin applications (pending | approved | rejected)
alter table public.profiles add column if not exists application_status text;
comment on column public.profiles.application_status is 'Application state: pending, approved, rejected (for collector/artist flow)';
