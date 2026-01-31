-- posts 테이블에 다중 이미지 URL 컬럼 추가 (없을 경우)
-- Supabase SQL Editor에서 실행하세요.
alter table public.posts add column if not exists image_urls text[];
