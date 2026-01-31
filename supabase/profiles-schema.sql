-- PUMWI profiles 테이블 (Supabase SQL Editor에서 실행)
-- auth.users 가입 시 프로필 행이 없으면 getCurrentUserProfile에서 기본값 반환하므로,
-- 선택적으로 트리거로 자동 생성할 수 있음.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  cover_url text,
  bio text,
  value_philosophy text,
  role text not null default 'user' check (role in ('user', 'artist')),
  is_artist_pending boolean not null default false,
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists value_philosophy text;

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 선택: 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
