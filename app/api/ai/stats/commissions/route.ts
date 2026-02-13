import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count commission requests for this artist. Uses all requests as "pending" if no status column.
    const { count: countWithStatus, error: errWithStatus } = await supabase
      .from('artwork_requests')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', user.id)
      .eq('status', 'pending')

    if (!errWithStatus) {
      const n = countWithStatus ?? 0
      return NextResponse.json({
        count: n,
        message: n === 1 ? 'You have 1 pending commission.' : `You have ${n} pending commissions.`,
      })
    }

    // No status column or other error: count all requests for this artist and treat as pending
    const { count, error } = await supabase
      .from('artwork_requests')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', user.id)

    if (error) {
      console.error('[ai/stats/commissions]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const n = count ?? 0
    return NextResponse.json({
      count: n,
      message: n === 1 ? 'You have 1 pending commission.' : `You have ${n} pending commissions.`,
    })
  } catch (err) {
    console.error('[ai/stats/commissions]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
