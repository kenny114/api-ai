import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key, requests_used, requests_limit, is_active, created_at, last_used_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const keys = data.map(k => ({
    id: k.id,
    name: k.name,
    key_display: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
    requests_used: k.requests_used,
    requests_limit: k.requests_limit,
    is_active: k.is_active,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
  }))

  return NextResponse.json({ keys })
}

export async function POST(request: NextRequest) {
  let body: { name?: string; requests_limit?: number } = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const { name, requests_limit = 1000 } = body
  const key = `sk_live_${randomBytes(32).toString('hex')}`

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ key, name: name || null, requests_limit })
    .select('id, name, requests_limit, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ key, ...data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  let body: { id?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }

  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('api_keys').delete().eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
