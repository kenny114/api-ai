import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { analyzeWebsite } from '@/lib/website-analyze'
import { closeBrowser } from '@/lib/browser'

export const runtime = 'nodejs'

const Schema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  url: z.string().url().optional(),
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

  const { lead_id, url } = parsed.data
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

  const targetUrl = url ?? (lead.profile_url as string | null)
  if (!targetUrl) {
    return NextResponse.json(
      {
        error: 'No URL available. Provide url or ensure lead has a profile_url.',
        code: 'MISSING_URL',
      },
      { status: 400 }
    )
  }

  let websiteAnalysis
  try {
    websiteAnalysis = await analyzeWebsite(targetUrl)
  } catch (err) {
    console.error('Website analysis error:', err)
    return NextResponse.json(
      {
        error: 'Website analysis failed',
        code: 'ANALYSIS_ERROR',
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
        website_analysis: websiteAnalysis,
        website_analyzed_at: new Date().toISOString(),
      },
    })
    .eq('id', lead_id)

  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/leads/website-analyze' })

  return NextResponse.json({
    lead_id,
    website_analysis: websiteAnalysis,
    updated_at: new Date().toISOString(),
  })
}
