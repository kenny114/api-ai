import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { analyzeSocialProfiles, closeSocialBrowser, type SocialPlatform } from '@/lib/social-analyze'

export const runtime = 'nodejs'

const Schema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  social_urls: z.array(z.string().url()).optional(),
  platform: z.enum(['instagram', 'twitter', 'linkedin']).optional(),
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

  const { lead_id, social_urls, platform } = parsed.data
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

  let socialAnalysis
  try {
    socialAnalysis = await analyzeSocialProfiles({
      lead: lead as Record<string, unknown>,
      socialUrls: social_urls,
      platform: platform as SocialPlatform | undefined,
    })
  } catch (err) {
    console.error('Social analysis error:', err)
    return NextResponse.json(
      {
        error: 'Social analysis failed',
        code: 'ANALYSIS_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    await closeSocialBrowser()
  }

  const existingMeta = (lead.metadata as Record<string, unknown>) ?? {}
  await supabase
    .from('leads')
    .update({
      metadata: {
        ...existingMeta,
        social_analysis: socialAnalysis,
        social_analyzed_at: new Date().toISOString(),
      },
    })
    .eq('id', lead_id)

  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/leads/social-analyze' })

  return NextResponse.json({
    lead_id,
    social_analysis: socialAnalysis,
    updated_at: new Date().toISOString(),
  })
}
