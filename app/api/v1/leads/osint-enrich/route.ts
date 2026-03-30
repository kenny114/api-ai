import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { enrichOsint } from '@/lib/osint'
import { closeBrowser } from '@/lib/browser'

export const runtime = 'nodejs'

const Schema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  company_name: z.string().min(1).max(200).optional(),
  domain: z.string().min(3).max(200).optional(),
})

export async function POST(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, { status: 400 })
  }

  const parsed = Schema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { lead_id, company_name, domain } = parsed.data
  const supabase = createAdminClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .eq('api_key_id', apiKeyId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found', code: 'LEAD_NOT_FOUND' }, { status: 404 })
  }

  const resolvedDomain = domain ?? extractDomain(lead.profile_url as string | null)
  const resolvedCompany = company_name ?? (lead.name as string) ?? ''

  if (!resolvedDomain) {
    return NextResponse.json(
      {
        error: 'Could not resolve domain. Provide domain or ensure lead has a profile_url.',
        code: 'MISSING_DOMAIN',
      },
      { status: 400 }
    )
  }

  let enrichment
  try {
    enrichment = await enrichOsint({ domain: resolvedDomain, companyName: resolvedCompany })
  } catch (err) {
    console.error('OSINT enrichment error:', err)
    return NextResponse.json(
      {
        error: 'OSINT enrichment failed',
        code: 'ENRICHMENT_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    await closeBrowser()
  }

  const existingMeta = (lead.metadata as Record<string, unknown>) ?? {}
  await supabase
    .from('leads')
    .update({
      metadata: {
        ...existingMeta,
        osint: enrichment,
        osint_enriched_at: new Date().toISOString(),
      },
    })
    .eq('id', lead_id)

  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/leads/osint-enrich' })

  return NextResponse.json({
    lead_id,
    ...enrichment,
    updated_at: new Date().toISOString(),
  })
}

function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
