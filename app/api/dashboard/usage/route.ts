import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const limit = 50
  const offset = page * limit

  const supabase = createAdminClient()
  const { data, error, count } = await supabase
    .from('usage_logs')
    .select('id, endpoint, created_at, api_keys(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data, total: count ?? 0, page, limit })
}
