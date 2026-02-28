-- AI Concierge: 한국 체험 장소 추천용
create table if not exists public.experience_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  categories text[] not null default '{}',
  lat double precision,
  lng double precision,
  image_url text,
  link text,
  created_at timestamptz default now()
);

comment on table public.experience_places is 'AI Concierge: Top places for Korea experiences by category';

-- RLS: public read
alter table public.experience_places enable row level security;
create policy "Anyone can read experience_places"
  on public.experience_places for select using (true);

-- Seed: use canonical category_m (pottery, temple, nature, cooking, street_food, palace, museum, art, traditional, village, design, history, culture)
insert into public.experience_places (name, description, categories, lat, lng, image_url, link)
values
  ('National Museum of Korea', 'Largest museum in Korea with art and history.', array['museum', 'art', 'history', 'culture'], 37.5239, 126.9805, null, 'https://www.museum.go.kr'),
  ('Gyeongbokgung Palace', 'Main royal palace of the Joseon dynasty.', array['palace', 'history', 'culture', 'traditional'], 37.5796, 126.9770, null, 'https://www.royalpalace.go.kr'),
  ('Bukchon Hanok Village', 'Traditional Korean village in Seoul.', array['traditional', 'village', 'culture'], 37.5820, 126.9853, null, null),
  ('Dongdaemun Design Plaza', 'Landmark with exhibitions and design.', array['design', 'art', 'culture'], 37.5666, 127.0094, null, null),
  ('PUMWI Gallery', 'Contemporary art and masterpieces.', array['art', 'culture'], 37.5172, 127.0473, null, null),
  ('Icheon Ceramics Village', 'Hands-on pottery and traditional ceramics.', array['pottery', 'traditional', 'village'], 37.2794, 127.4356, null, null),
  ('Jogyesa Temple', 'Seoul temple stay and meditation.', array['temple', 'nature', 'culture'], 37.5745, 126.9850, null, null),
  ('Namsan Park', 'Hiking and nature in the heart of Seoul.', array['nature', 'culture'], 37.5502, 126.9920, null, null),
  ('Gwangjang Market', 'Authentic street food and local eats.', array['street_food', 'cooking', 'culture'], 37.5698, 126.9904, null, null);
