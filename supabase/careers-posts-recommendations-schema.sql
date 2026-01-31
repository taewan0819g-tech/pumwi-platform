-- profiles에 value_philosophy 컬럼 추가 (없을 경우)
alter table public.profiles add column if not exists value_philosophy text;

-- careers 테이블
create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  title text not null,
  start_date text not null,
  end_date text,
  description text,
  created_at timestamptz default now()
);

alter table public.careers enable row level security;

create policy "Users can manage own careers"
  on public.careers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- posts 테이블 (작업일지 work_log, 판매 sales)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('work_log', 'sales')),
  title text not null,
  content text,
  image_url text,
  price numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Users can manage own posts"
  on public.posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read posts"
  on public.posts for select
  using (true);

-- recommendations 테이블 (받은 추천서)
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  writer_name text,
  writer_role text,
  content text not null,
  created_at timestamptz default now()
);
-- 기존 테이블에 컬럼 추가: alter table public.recommendations add column if not exists writer_name text; alter table public.recommendations add column if not exists writer_role text;

alter table public.recommendations enable row level security;

create policy "Users can read recommendations for self"
  on public.recommendations for select
  using (auth.uid() = user_id or auth.uid() = author_id);

create policy "Users can insert recommendations (for self or others)"
  on public.recommendations for insert
  with check (auth.uid() = author_id);

create policy "Users can delete own recommendations (as author or recipient)"
  on public.recommendations for delete
  using (auth.uid() = user_id or auth.uid() = author_id);
