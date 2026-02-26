-- Orders: 포장 증빙 사진 및 발송 완료 플래그 (아티스트 발송 관리)
-- No Proof, No Shipping: packaging_photo_1~4 저장 후 DHL 운송장 출력 버튼 활성화
alter table public.orders add column if not exists packaging_photos text[] default null;
alter table public.orders add column if not exists packaging_photo_1 text default null;
alter table public.orders add column if not exists packaging_photo_2 text default null;
alter table public.orders add column if not exists packaging_photo_3 text default null;
alter table public.orders add column if not exists packaging_photo_4 text default null;
alter table public.orders add column if not exists packaging_confirmed boolean default false;
alter table public.orders add column if not exists tracking_number text default null;
alter table public.orders add column if not exists is_remote_area boolean default false;
comment on column public.orders.packaging_photos is 'Legacy: 발송 전 포장 증빙 사진 URL 배열';
comment on column public.orders.packaging_photo_1 is '① 완충재에 싸인 작품 사진 URL';
comment on column public.orders.packaging_photo_2 is '② 내부 포장 상자 안쪽 사진 URL';
comment on column public.orders.packaging_photo_3 is '③ 송장 붙은 겉박스 사진 URL';
comment on column public.orders.packaging_photo_4 is '④ 5-5-5 및 흔들림 테스트 확인 사진 URL';
comment on column public.orders.packaging_confirmed is '포장 가이드 체크리스트 + 사진 4장 완료 여부';
comment on column public.orders.tracking_number is '운송장 번호';
comment on column public.orders.is_remote_area is 'DHL Remote/Extended Area 여부';
