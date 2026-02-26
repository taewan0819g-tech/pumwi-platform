-- DHL 방문 예약(Pickup): Shippo Transaction ID 및 예약 결과 저장
-- 운송장(Label) 생성 후 Shippo Transaction ID를 저장하고, 방문 예약 시 예약 정보 기록
alter table public.orders add column if not exists shippo_transaction_id text;
alter table public.orders add column if not exists pickup_confirmation_code text;
alter table public.orders add column if not exists pickup_requested_at timestamptz;
alter table public.orders add column if not exists pickup_time_slot text;
alter table public.orders add column if not exists pickup_object_id text;
comment on column public.orders.shippo_transaction_id is 'Shippo Transaction ID (운송장 생성 완료 시 연결)';
comment on column public.orders.pickup_confirmation_code is 'DHL 픽업 예약 확인 번호';
comment on column public.orders.pickup_requested_at is '방문 희망 날짜(저장 시점)';
comment on column public.orders.pickup_time_slot is '희망 시간대: am | pm';
comment on column public.orders.pickup_object_id is 'Shippo Pickup object_id';
