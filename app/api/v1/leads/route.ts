import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!
  const { searchParams } = request.nextUrl

  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const platform = searchParams.get('platform') ?? undefined

  const from = (page - 1) * limit
  const to   = from + limit - 1

  const supabase = createAdminClient()

  let query = supabase
    .from('leads')
    .select('id, name, username, platform, profile_url, metadata, created_at', { count: 'exact' })
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('DB error fetching leads:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch leads', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
