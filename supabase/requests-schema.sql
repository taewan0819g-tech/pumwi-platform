-- VIP / AI Art Concierge 매칭 요청 테이블
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text,
  budget text,
  content text not null,
  created_at timestamptz default now()
);

alter table public.requests enable row level security;

-- 본인만 자신의 요청 insert 가능
create policy "Users can insert own request"
  on public.requests for insert
  with check (auth.uid() = user_id);

-- 본인만 자신의 요청 조회 가능 (선택)
create policy "Users can read own requests"
  on public.requests for select
  using (auth.uid() = user_id);
