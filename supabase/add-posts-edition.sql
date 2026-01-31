-- posts 테이블에 에디션(수량) 컬럼 추가 (가격 대신 희소성 표시용)
-- Supabase SQL Editor에서 실행하세요.
alter table public.posts add column if not exists edition_number integer;
alter table public.posts add column if not exists edition_total integer;
