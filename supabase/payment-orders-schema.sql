-- PUMWI 컬렉터 결제 내역 (토스페이먼츠 연동)
-- 결제 준비 시 pending, 승인 완료 시 paid, 실패 시 failed

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount >= 0),
  order_id text not null unique,
  order_name text,
  payment_key text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payment_orders_order_id on public.payment_orders(order_id);
create index if not exists idx_payment_orders_buyer_id on public.payment_orders(buyer_id);
create index if not exists idx_payment_orders_post_id on public.payment_orders(post_id);

alter table public.payment_orders enable row level security;

create policy "Buyers can read own payment_orders"
  on public.payment_orders for select
  using (auth.uid() = buyer_id);

create policy "Sellers can read own payment_orders"
  on public.payment_orders for select
  using (auth.uid() = seller_id);

create policy "Authenticated can insert own payment_orders"
  on public.payment_orders for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers can update own payment_orders"
  on public.payment_orders for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

comment on table public.payment_orders is 'Collector purchase orders (Toss Payments). status: pending -> paid | failed';
