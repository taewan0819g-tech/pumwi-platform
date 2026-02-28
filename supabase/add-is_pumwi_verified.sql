-- Add is_pumwi_verified for two-track (Tier 1 vs Tier 2) concierge.
-- If your table is named experience_spots, run: alter table experience_spots add column if not exists is_pumwi_verified boolean default false;

alter table public.experience_places add column if not exists is_pumwi_verified boolean default false;
alter table public.workshops add column if not exists is_pumwi_verified boolean default false;

comment on column public.experience_places.is_pumwi_verified is 'Tier 1: PUMWI Exclusive Artisan; shown first and with premium card UI';
comment on column public.workshops.is_pumwi_verified is 'Tier 1: PUMWI Exclusive Artisan; shown first and with premium card UI';
