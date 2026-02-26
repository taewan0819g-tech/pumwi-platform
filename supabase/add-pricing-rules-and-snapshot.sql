-- PUMWI Pricing Engine: pricing_rules 테이블 및 결제 스냅샷 컬럼

-- pricing_rules: 티어별 수수료율 (is_active=true만 사용)
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('standard', 'care', 'global')),
  commission_rate numeric not null check (commission_rate >= 0 and commission_rate <= 1),
  is_active boolean not null default true,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tier)
);

create index if not exists idx_pricing_rules_is_active on public.pricing_rules(is_active);
comment on table public.pricing_rules is 'Platform commission by tier. Only is_active=true rules are used.';

-- Seed default rules (run once; safe to re-run with ON CONFLICT)
-- Partnership: Standard 20%, PUMWI Care 30%, PUMWI Global 40%
insert into public.pricing_rules (tier, commission_rate, is_active, name)
values
  ('standard', 0.20, true, 'Standard'),
  ('care', 0.30, true, 'PUMWI Care'),
  ('global', 0.40, true, 'PUMWI Global')
on conflict (tier) do update set
  commission_rate = excluded.commission_rate,
  is_active = excluded.is_active,
  name = excluded.name,
  updated_at = now();

-- posts: 서비스 티어 (작품 업로드 시 저장, 비율은 저장하지 않음)
alter table public.posts add column if not exists service_tier text default 'standard' check (service_tier in ('standard', 'care', 'global'));
comment on column public.posts.service_tier is 'Standard | PUMWI Care | PUMWI Global (text only, rate from pricing_rules)';

-- payment_orders: 정산 스냅샷 (확정 시점의 rule id와 rate 저장)
alter table public.payment_orders add column if not exists applied_rule_id uuid references public.pricing_rules(id) on delete set null;
alter table public.payment_orders add column if not exists applied_rate numeric;
comment on column public.payment_orders.applied_rule_id is 'Snapshot: pricing_rule used at confirmation';
comment on column public.payment_orders.applied_rate is 'Snapshot: commission rate applied at confirmation';

alter table public.pricing_rules enable row level security;
create policy "Anyone can read active pricing_rules"
  on public.pricing_rules for select
  using (is_active = true);

create policy "Only admins can manage pricing_rules"
  on public.pricing_rules for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
