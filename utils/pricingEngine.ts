  /**
   * PUMWI Pricing Engine
   * - Active rules from pricing_rules (is_active=true). Rate is never stored on post/product.
   * - calculatePayout(price, tier, rules) for preview (client) and confirmation (server).
   */

  export type ServiceTier = 'standard' | 'care' | 'global'

  export interface PricingRule {
    id: string
    tier: string
    commission_rate: number
    is_active: boolean
    name?: string | null
    created_at?: string
    updated_at?: string
  }

  export interface PayoutResult {
    applied_rule_id: string
    applied_rate: number
    platform_fee: number
    artisan_payout: number
  }

  function normalizeTier(tier: string): ServiceTier {
    const t = tier?.toLowerCase().trim()
    if (t === 'care' || t === 'global') return t
    return 'standard'
  }

  /**
   * Find the active rule for the given tier. Uses first matching rule when multiple exist.
   */
  export function findRuleForTier(rules: PricingRule[], tier: ServiceTier): PricingRule | null {
    const normalized = normalizeTier(tier)
    const rule = rules.find((r) => r.is_active && normalizeTier(r.tier) === normalized)
    return rule ?? null
  }

  /**
   * Calculate platform fee and artisan payout from price and tier using current rules.
   * Does not round; caller may round for display/storage.
   */
  export function calculatePayout(
    price: number,
    tier: string,
    rules: PricingRule[]
  ): PayoutResult | null {
    if (!Number.isFinite(price) || price < 0) return null

    const normalizedTier = normalizeTier(tier)
    let rule = findRuleForTier(rules, normalizedTier)

    // 🛡️ [플랜 B 안전장치 시작] DB에서 규칙을 못 찾으면 하드코딩된 기본값 적용!
    if (!rule) {
      console.warn(`[PricingEngine] DB에서 '${normalizedTier}' 수수료를 못 찾았습니다. 안전장치(기본값)를 가동합니다.`)

      // PUMWI 기본 수수료율 (Standard 20%, Care 30%, Global 40%)
      const defaultRates: Record<ServiceTier, number> = {
        standard: 0.2,
        care: 0.3,
        global: 0.4
      }

      rule = {
        id: `fallback_${normalizedTier}_${Date.now()}`, // 가짜 ID 발급
        tier: normalizedTier,
        commission_rate: defaultRates[normalizedTier],
        is_active: true
      }
    }
    // 🛡️ [플랜 B 안전장치 끝]

    const rate = Number(rule.commission_rate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null

    const platform_fee = price * rate
    const artisan_payout = price - platform_fee

    return {
      applied_rule_id: rule.id,
      applied_rate: rate,
      platform_fee,
      artisan_payout,
    }
  }

  /**
   * Rounded KRW values for display and DB snapshot.
   */
  export function calculatePayoutRounded(
    price: number,
    tier: string,
    rules: PricingRule[]
  ): (PayoutResult & { platform_fee: number; artisan_payout: number }) | null {
    const raw = calculatePayout(price, tier, rules)
    if (!raw) return null
    return {
      ...raw,
      platform_fee: Math.round(raw.platform_fee),
      artisan_payout: Math.round(raw.artisan_payout),
    }
  }
