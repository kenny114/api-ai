import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: { secret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { secret } = body
  if (!secret) {
    return NextResponse.json({ error: 'Missing secret' }, { status: 400 })
  }

  // 1. Check owner secret (ADMIN_SECRET env var)
  let authorized = !!(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET)

  // 2. If not owner, check named admin_users table
  if (!authorized) {
    const hash = createHash('sha256').update(secret).digest('hex')
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('secret_hash', hash)
      .maybeSingle()
    authorized = data?.is_active === true
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('dash_session', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
