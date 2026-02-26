-- 상품 가격 (KRW). 소장하기 결제 금액으로 사용됨.
alter table public.products add column if not exists price integer check (price is null or price >= 0);
comment on column public.products.price is 'Sale price in KRW; used as payment amount when collecting this product.';
