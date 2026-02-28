-- PUMWI 수석 로컬 가이드: 공방(workshop) 매칭용
-- 카테고리, 체험/판매, 언어, 교통, 워크인, 분위기, 안티타겟
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  categories text[] not null default '{}',
  experience_content text[] default '{}',
  products_for_sale text[] default '{}',
  language_support text not null default 'basic' check (language_support in ('none', 'basic', 'fluent')),
  transit_walking_minutes int,
  walk_in_available boolean not null default false,
  atmosphere_hashtags text[] default '{}',
  anti_target text[] default '{}',
  lat double precision,
  lng double precision,
  image_url text,
  link text,
  created_at timestamptz default now()
);

comment on table public.workshops is 'Concierge: workshops for matching by transport, language, anti-target, walk-in';

alter table public.workshops enable row level security;
create policy "Anyone can read workshops"
  on public.workshops for select using (true);

-- Seed: 공방 예시 (워크인/예약제, 교통, 노키즈 등 다양하게)
insert into public.workshops (
  name, description, categories, experience_content, products_for_sale,
  language_support, transit_walking_minutes, walk_in_available, atmosphere_hashtags, anti_target, lat, lng
) values
  (
    'Seoul Hands-on Pottery',
    'Make your own ceramic piece with a local artisan.',
    array['pottery', 'traditional', 'culture'],
    array['wheel throwing', 'hand-building', 'glazing'],
    array['ceramic cups', 'plates', 'vases', 'souvenir sets'],
    'basic',
    8,
    true,
    array['#hands-on', '#family-friendly', '#relaxed'],
    '{}',
    37.5745, 126.9850
  ),
  (
    'Quiet Ceramics Studio',
    'A calm space for focused ceramic work. Reservation only.',
    array['pottery', 'art'],
    array['wheel throwing', 'advanced glazing'],
    array['custom orders', 'art pieces'],
    'none',
    12,
    false,
    array['#quiet', '#focused', '#adults-only'],
    array['노키즈', '조용한 공간을 원함', 'no kids'],
    37.5680, 126.9820
  ),
  (
    'Gwangjang Market Souvenir Spot',
    'No experience—just browse and buy unique crafts and snacks.',
    array['street_food', 'cooking', 'culture'],
    '{}',
    array['traditional snacks', 'craft souvenirs', 'hanbok accessories', 'ceramic trinkets'],
    'basic',
    5,
    true,
    array['#market', '#souvenir', '#walk-in'],
    '{}',
    37.5698, 126.9904
  ),
  (
    'Hanok Craft Experience',
    'Traditional craft in a hanok. Family-friendly, 10 min from subway.',
    array['traditional', 'village', 'culture'],
    array['traditional craft', 'mini hanok model', 'paper craft'],
    array['hanok models', 'paper crafts', 'souvenir boxes'],
    'fluent',
    10,
    true,
    array['#family-friendly', '#traditional', '#kids-welcome'],
    '{}',
    37.5820, 126.9853
  ),
  (
    'Icheon Ceramics Atelier',
    'Famous for ceramics. Reservation recommended; walk-in when space allows.',
    array['pottery', 'traditional', 'village'],
    array['wheel throwing', 'kiln visit', 'glazing'],
    array['ceramic tableware', 'tea sets', 'souvenir ceramics'],
    'basic',
    25,
    true,
    array['#pottery', '#traditional', '#souvenir'],
    '{}',
    37.2794, 127.4356
  );
