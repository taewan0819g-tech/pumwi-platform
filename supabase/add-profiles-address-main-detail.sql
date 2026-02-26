-- 아티스트 주소 체계: 기본 주소(구글 검색), 상세 주소, 공개 여부
-- address_main: 지도 핀·프로필 지역명 표시 및 Shippo 픽업지 기본 주소
-- address_detail: 상세 주소(Apartment, Suite 등), is_address_detail_public 이 true일 때만 프로필에 노출
-- zip_code: Shippo 배송비 계산용 우편번호 (workshop_zip 과 동기화 가능)
alter table public.profiles add column if not exists address_main text;
alter table public.profiles add column if not exists address_detail text;
alter table public.profiles add column if not exists zip_code text;
alter table public.profiles add column if not exists is_address_detail_public boolean not null default false;
comment on column public.profiles.address_main is 'Google Places 기본 주소 (지도·프로필 지역명 및 Shippo address_from 용)';
comment on column public.profiles.address_detail is '상세 주소 (Apartment, Suite 등). 비공개 시 배송/픽업용으로만 사용';
comment on column public.profiles.zip_code is '우편번호 (Shippo 배송비 계산용)';
comment on column public.profiles.is_address_detail_public is 'true일 때만 프로필에 상세 주소 노출';
