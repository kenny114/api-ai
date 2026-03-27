import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { randomBytes, createHash } from 'crypto'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data })
}

export async function POST(request: NextRequest) {
  let body: { name?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const secret      = `adm_${randomBytes(24).toString('hex')}`
  const secret_hash = createHash('sha256').update(secret).digest('hex')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .insert({ name: body.name.trim(), secret_hash })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ secret, ...data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  let body: { id?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }

  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('admin_users').delete().eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
