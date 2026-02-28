-- Concierge: Category-first (waterfall) then distance. Strict category_l filter.
-- 1) Filter by category_l (mandatory when provided). 2) Optionally narrow by category_m, category_s. 3) Order by dist_meters ASC, LIMIT.

create or replace function public.get_nearby_experiences(
  user_lat double precision,
  user_lng double precision,
  category_l text default null,
  category_m text default null,
  category_s text default null,
  limit_count int default 20,
  max_meters double precision default 50000
)
returns table (
  id uuid,
  name text,
  description_en text,
  category_l text,
  category_m text,
  category_s text,
  dist_meters double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with user_point as (
    select st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography as g
  ),
  nearby as (
    select
      s.id,
      s.name,
      s.description_en,
      s.category_l,
      s.category_m,
      s.category_s,
      round(
        (select st_distance(s.location, up.g) from user_point up)
      )::double precision as dist_meters
    from experience_spots s
    cross join user_point up
    where s.location is not null
      and st_dwithin(s.location, up.g, max_meters)
      -- 1) Category-first: when category_l is provided, only that top-level category (block all others)
      and (category_l is null or category_l = '' or s.category_l = category_l)
      -- 2) Optional narrow by category_m
      and (category_m is null or category_m = '' or lower(trim(s.category_m)) = lower(trim(category_m)))
      -- 3) Optional narrow by category_s (partial match)
      and (category_s is null or category_s = '' or s.category_s ilike '%' || trim(category_s) || '%')
  )
  select n.id, n.name, n.description_en, n.category_l, n.category_m, n.category_s, n.dist_meters
  from nearby n
  order by n.dist_meters asc
  limit limit_count;
$$;

comment on function public.get_nearby_experiences is 'Category waterfall: 1) Filter by category_l (exact). 2) Optionally category_m, category_s. 3) Order by dist_meters ASC, LIMIT.';
