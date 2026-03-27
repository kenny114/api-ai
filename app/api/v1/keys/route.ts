import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  requests_limit: z.number().int().min(1).max(1_000_000).default(1000),
})

export async function POST(request: NextRequest) {
  // Require ADMIN_SECRET header — this endpoint is excluded from the API key middleware
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET env var is not configured', code: 'SERVER_MISCONFIGURED' },
      { status: 500 }
    )
  }

  const provided = request.headers.get('x-admin-secret')
  if (!provided || provided !== adminSecret) {
    return NextResponse.json(
      { error: 'Invalid or missing x-admin-secret header', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // Parse body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 }
    )
  }

  const parsed = CreateKeySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, requests_limit } = parsed.data

  // Generate key: sk_live_ + 32 random bytes as hex = 64 hex chars
  const key = `sk_live_${randomBytes(32).toString('hex')}`

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key,
      name: name ?? null,
      requests_limit,
    })
    .select('id, name, requests_limit, created_at')
    .single()

  if (error) {
    console.error('Failed to create API key:', error.message)
    return NextResponse.json(
      { error: 'Failed to create API key', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      key,                        // shown only once — store it securely
      id: data.id,
      name: data.name,
      requests_limit: data.requests_limit,
      created_at: data.created_at,
      warning: 'Store this key securely — it will not be shown again.',
    },
    { status: 201 }
  )
}
