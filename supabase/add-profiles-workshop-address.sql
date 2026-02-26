-- Seller workshop address for shipping rate calculation (origin = seller, shipper = PUMWI)
alter table public.profiles add column if not exists workshop_street1 text;
alter table public.profiles add column if not exists workshop_city text;
alter table public.profiles add column if not exists workshop_state text;
alter table public.profiles add column if not exists workshop_zip text;
alter table public.profiles add column if not exists workshop_country text default 'KR';
comment on column public.profiles.workshop_street1 is 'Artist workshop street for DHL rate origin';
comment on column public.profiles.workshop_city is 'Artist workshop city';
comment on column public.profiles.workshop_state is 'Artist workshop state';
comment on column public.profiles.workshop_zip is 'Artist workshop postal code';
comment on column public.profiles.workshop_country is 'Artist workshop country code (e.g. KR)';
