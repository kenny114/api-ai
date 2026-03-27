import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { encrypt } from '@/lib/encrypt'

export const runtime = 'nodejs'

const PlatformEnum = z.enum(['instagram', 'twitter', 'linkedin'])

const UpsertSchema = z.object({
  platform: PlatformEnum,
  value: z.string().min(1),
})

const DeleteSchema = z.object({
  platform: PlatformEnum,
})

// POST /api/v1/credentials — store or update a platform credential
export async function POST(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, { status: 400 })
  }

  const parsed = UpsertSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { platform, value } = parsed.data

  let credentialEnc: string
  try {
    credentialEnc = encrypt(value)
  } catch {
    return NextResponse.json(
      { error: 'Encryption not configured on server', code: 'ENCRYPTION_ERROR' },
      { status: 500 }
    )
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('platform_credentials')
    .upsert(
      {
        api_key_id: apiKeyId,
        platform,
        credential_enc: credentialEnc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'api_key_id,platform' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to save credential', code: 'DB_ERROR' }, { status: 500 })
  }

  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/credentials' })

  return NextResponse.json({ platform, status: 'saved' })
}

// DELETE /api/v1/credentials — remove a stored credential
export async function DELETE(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, { status: 400 })
  }

  const parsed = DeleteSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { platform } = parsed.data
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('platform_credentials')
    .delete()
    .eq('api_key_id', apiKeyId)
    .eq('platform', platform)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete credential', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ platform, status: 'deleted' })
}

// GET /api/v1/credentials — list which platforms have credentials stored (no values returned)
export async function GET(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('platform_credentials')
    .select('platform, created_at, updated_at')
    .eq('api_key_id', apiKeyId)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch credentials', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ credentials: data ?? [] })
}
