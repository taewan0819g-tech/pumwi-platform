-- likes: 게시물 좋아요 (post_id, user_id)
-- comments: 댓글 (post_id, user_id, content, created_at) + profiles 조인용
-- 이미 테이블이 있다면 실행하지 마세요.

-- likes 테이블
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
alter table public.likes enable row level security;
create policy "Anyone can read likes" on public.likes for select using (true);
create policy "Users can insert own like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own like" on public.likes for delete using (auth.uid() = user_id);

-- comments 테이블
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy "Anyone can read comments" on public.comments for select using (true);
create policy "Authenticated can insert comment" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comment" on public.comments for delete using (auth.uid() = user_id);
