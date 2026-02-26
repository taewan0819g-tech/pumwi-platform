import { createClient } from '@/lib/supabase/server'
import { getActivePricingRules } from '@/lib/pricingEngineServer'
import { NextResponse } from 'next/server'

/**
 * GET /api/pricing/rules
 * Returns active pricing rules for client-side payout preview.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const rules = await getActivePricingRules(supabase)
    return NextResponse.json(rules)
  } catch (e) {
    console.error('[pricing/rules]', e)
    return NextResponse.json({ error: 'Failed to load pricing rules' }, { status: 500 })
  }
}
