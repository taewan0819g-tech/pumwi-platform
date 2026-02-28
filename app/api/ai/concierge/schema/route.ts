import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Returns distinct category_l and category_m from experience_spots (Zero-Instruction Search).
 * Used by categories API so the LLM only picks from actual DB values.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('experience_spots')
      .select('category_l, category_m')
      .limit(2000)

    if (error) {
      console.error('[concierge/schema]', error)
      return NextResponse.json(
        { error: 'Schema fetch failed.', details: error.message },
        { status: 500 }
      )
    }

    const rows = data ?? []
    const category_l = [...new Set(rows.map((r) => r.category_l).filter(Boolean))] as string[]
    const category_m = [...new Set(rows.map((r) => r.category_m).filter(Boolean))] as string[]

    return NextResponse.json({ category_l, category_m })
  } catch (err) {
    console.error('[concierge/schema]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Schema fetch failed.', details: message },
      { status: 500 }
    )
  }
}
