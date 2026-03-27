import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createAdminClient()

  const [keysResult, leadsResult, sentResult] = await Promise.all([
    supabase.from('api_keys').select('requests_used'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
  ])

  const apiKeys = keysResult.data ?? []
  const totalRequests = apiKeys.reduce((sum, k) => sum + (k.requests_used ?? 0), 0)

  return NextResponse.json({
    api_keys: apiKeys.length,
    total_requests: totalRequests,
    leads: leadsResult.count ?? 0,
    messages_sent: sentResult.count ?? 0,
  })
}
