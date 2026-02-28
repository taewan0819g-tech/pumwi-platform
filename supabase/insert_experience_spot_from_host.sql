-- Host application: insert into experience_spots with PostGIS location from lat/lng.
-- Run this in Supabase SQL editor or via migration.

create or replace function public.insert_experience_spot_from_host(
  p_lat double precision,
  p_lng double precision,
  p_name text,
  p_category_l text,
  p_category_m text,
  p_category_s text,
  p_description_en text default null,
  p_philosophy text default null,
  p_mood_tags text[] default null,
  p_anti_target text default null,
  p_address_en text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.experience_spots (
    name,
    category_l,
    category_m,
    category_s,
    description_en,
    philosophy,
    mood_tags,
    anti_target,
    address_en,
    location,
    is_pumwi_verified
  ) values (
    coalesce(nullif(trim(p_name), ''), 'Host Venue'),
    p_category_l,
    p_category_m,
    p_category_s,
    nullif(trim(p_description_en), ''),
    nullif(trim(p_philosophy), ''),
    p_mood_tags,
    nullif(trim(p_anti_target), ''),
    nullif(trim(p_address_en), ''),
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    false
  )
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.insert_experience_spot_from_host is 'Insert a host application into experience_spots with geography from lat/lng; is_pumwi_verified=false for admin review';
