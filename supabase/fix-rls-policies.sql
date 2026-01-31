-- RLS 정책 수정: careers, posts, recommendations INSERT/SELECT/UPDATE/DELETE 허용
-- Supabase 대시보드 > SQL Editor에서 이 파일 내용을 실행하세요.
-- 실행 후 브라우저에서 로그인 상태로 다시 시도하세요.

-- ========== profiles ==========
-- INSERT 시 FK 검사로 다른 유저의 profiles 행을 읽어야 하므로, SELECT를 허용
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- FK 참조 검사 통과: careers/posts/recommendations insert 시 상대방 profile id 확인용
drop policy if exists "Allow read profiles for fk" on public.profiles;
create policy "Allow read profiles for fk"
  on public.profiles for select
  using (true);

-- ========== careers ==========
drop policy if exists "Users can manage own careers" on public.careers;
create policy "Users can manage own careers"
  on public.careers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== posts ==========
drop policy if exists "Users can manage own posts" on public.posts;
drop policy if exists "Anyone can read posts" on public.posts;

create policy "Users can manage own posts"
  on public.posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read posts"
  on public.posts for select
  using (true);

-- ========== recommendations ==========
drop policy if exists "Users can read recommendations for self" on public.recommendations;
drop policy if exists "Users can insert recommendations (for self or others)" on public.recommendations;
drop policy if exists "Users can delete own recommendations (as author or recipient)" on public.recommendations;

-- 읽기: 받은 사람(user_id)이 나이거나 작성자(author_id)가 나인 경우
create policy "Users can read recommendations for self"
  on public.recommendations for select
  using (auth.uid() = user_id or auth.uid() = author_id);

-- 삽입: 작성자(author_id)가 현재 로그인 유저여야 함
create policy "Users can insert recommendations (for self or others)"
  on public.recommendations for insert
  with check (auth.uid() = author_id);

-- 수정: 추천서는 보통 수정 불가로 두고, 필요 시 추가
-- 삭제: 받은 사람이 나이거나 작성자가 나인 경우
create policy "Users can delete own recommendations (as author or recipient)"
  on public.recommendations for delete
  using (auth.uid() = user_id or auth.uid() = author_id);
