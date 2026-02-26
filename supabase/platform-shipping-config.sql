-- PUMWI 플랫폼 발송 설정: DHL 라벨 Shipper(발송인) 정보
-- 운임 계산 시 Origin은 seller workshop 또는 이 테이블 기본값 사용
create table if not exists public.platform_shipping_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  street1 text,
  street2 text,
  city text,
  state text,
  zip text,
  country text not null default 'KR',
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.platform_shipping_config (key, name, street1, city, state, zip, country)
values ('pumwi_hq', 'PUMWI', '123 Origin St', 'Seoul', '', '04500', 'KR')
on conflict (key) do update set
  name = excluded.name,
  street1 = excluded.street1,
  city = excluded.city,
  state = excluded.state,
  zip = excluded.zip,
  country = excluded.country,
  updated_at = now();

comment on table public.platform_shipping_config is 'Platform Shipper (PUMWI HQ) for DHL labels; origin for rate calc can use seller workshop_address';
