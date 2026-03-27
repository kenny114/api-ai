import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!
  const { searchParams } = request.nextUrl

  const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const lead_id = searchParams.get('lead_id') ?? undefined
  const status  = searchParams.get('status')  ?? undefined

  const from = (page - 1) * limit
  const to   = from + limit - 1

  const supabase = createAdminClient()

  let query = supabase
    .from('messages')
    .select('id, lead_id, campaign_type, template, generated_message, tone, status, model_used, created_at', { count: 'exact' })
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (lead_id) query = query.eq('lead_id', lead_id)
  if (status)  query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) {
    console.error('DB error fetching messages:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch messages', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    messages: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
