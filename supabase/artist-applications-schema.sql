-- artist_applications: 아티스트 신청서
-- profiles.role에 'admin' 추가 (이미 있으면 무시)

-- role check에 admin 추가 (Supabase에서 수동으로 수정해도 됨)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'artist', 'admin'));

-- artist_applications 테이블
create table if not exists public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  answers jsonb not null default '{}',
  created_at timestamptz default now()
);

-- 거절 사유 (선택, 관리자 페이지에서 입력 시 저장)
alter table public.artist_applications add column if not exists rejection_reason text;

alter table public.artist_applications enable row level security;

-- 본인은 자신의 신청서만 조회 가능
create policy "Users can read own application"
  on public.artist_applications for select
  using (auth.uid() = user_id);

-- 본인은 pending 신청서만 insert (1건)
create policy "Users can insert own application"
  on public.artist_applications for insert
  with check (auth.uid() = user_id);

-- admin은 모든 신청서 조회 및 update 가능 (승인/거절)
create policy "Admin can read all applications"
  on public.artist_applications for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin can update applications"
  on public.artist_applications for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 거절된 신청은 본인이 재신청 시 pending으로 업데이트 가능
create policy "Users can update own rejected application"
  on public.artist_applications for update
  using (auth.uid() = user_id and status = 'rejected')
  with check (auth.uid() = user_id);
