-- 서비스 등급·수수료: products에 등급/수수료율, payment_orders에 수수료 컬럼, posts에 product_id

-- products: 서비스 등급 및 수수료율
alter table public.products add column if not exists service_tier text not null default 'standard' check (service_tier in ('standard', 'care', 'global'));
alter table public.products add column if not exists commission_rate numeric not null default 0.40 check (commission_rate >= 0 and commission_rate <= 1);

comment on column public.products.service_tier is 'Standard | Care | Global';
comment on column public.products.commission_rate is 'Platform commission rate (e.g. 0.40 = 40%)';

-- posts: 소장하기(sales) 게시물이 연결된 상품 (선택)
alter table public.posts add column if not exists product_id uuid references public.products(id) on delete set null;
create index if not exists idx_posts_product_id on public.posts(product_id);

-- payment_orders: 상품 연동 및 수수료 저장
alter table public.payment_orders add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.payment_orders add column if not exists service_tier text;
alter table public.payment_orders add column if not exists pg_fee integer;
alter table public.payment_orders add column if not exists platform_fee integer;
alter table public.payment_orders add column if not exists artisan_payout integer;

create index if not exists idx_payment_orders_product_id on public.payment_orders(product_id);

comment on column public.payment_orders.pg_fee is 'Payment gateway fee (e.g. Toss) in KRW';
comment on column public.payment_orders.platform_fee is 'PUMWI platform commission in KRW';
comment on column public.payment_orders.artisan_payout is 'Amount to artisan in KRW';
