/**
 * 고객 청구용 배송비 계산: 실제 비용을 5,000원 단위 무조건 올림.
 * 플랫폼 마진: shipping_margin_krw = charged_shipping_price_krw - real_shipping_cost_krw
 * @param real_shipping_cost_krw 실제 배송 비용 (KRW, 보험 포함 시 배송+보험 합계)
 * @returns 고객 청구 배송비 (KRW)
 */
export function calculateChargedShippingPrice(real_shipping_cost_krw: number): number {
  if (!Number.isFinite(real_shipping_cost_krw) || real_shipping_cost_krw <= 0) return 0
  return Math.ceil(real_shipping_cost_krw / 5000) * 5000
}
