import type { SupabaseClient } from '@supabase/supabase-js'
import type { PricingRule } from '@/utils/pricingEngine'

const CACHE_MS = 60_000 // 1 minute
let cachedRules: PricingRule[] | null = null
let cachedAt = 0

/**
 * Fetches is_active=true pricing rules from Supabase and caches in memory.
 * Use this server-side only (e.g. in API routes and confirm).
 */
export async function getActivePricingRules(
  supabase: SupabaseClient
): Promise<PricingRule[]> {
  const now = Date.now()
  if (cachedRules !== null && now - cachedAt < CACHE_MS) {
    return cachedRules
  }
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('tier')
  if (error) {
    console.error('[pricingEngine] getActivePricingRules error', error)
    if (cachedRules !== null) return cachedRules
    return []
  }
  const raw = (data ?? []) as Record<string, unknown>[]
  cachedRules = raw.filter(
    (r) => r.is_active === true || r.active === true
  ) as unknown as PricingRule[]
  cachedAt = now
  return cachedRules
}

/**
 * Optional: clear cache (e.g. after admin updates rules).
 */
export function clearPricingRulesCache(): void {
  cachedRules = null
  cachedAt = 0
}
