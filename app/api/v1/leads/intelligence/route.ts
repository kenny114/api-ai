import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { enrichOsint, type OsintResult } from '@/lib/osint'
import { analyzeSocialProfiles, type SocialAnalysisResult } from '@/lib/social-analyze'
import { analyzeWebsite, type WebsiteAnalysisResult } from '@/lib/website-analyze'
import { closeBrowser } from '@/lib/browser'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const Schema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  domain: z.string().min(3).max(200).optional(),
  company_name: z.string().min(1).max(200).optional(),
  social_urls: z.array(z.string().url()).optional(),
  website_url: z.string().url().optional(),
})

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

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

  const { lead_id, domain, company_name, social_urls, website_url } = parsed.data
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
  const resolvedWebsiteUrl = website_url ?? (lead.profile_url as string | null)

  try {
    // Run all three scrapers — they share the same remote browser connection
    const [osintResult, socialResult, websiteResult] = await Promise.allSettled([
      resolvedDomain
        ? enrichOsint({ domain: resolvedDomain, companyName: resolvedCompany })
        : Promise.resolve(null),
      analyzeSocialProfiles({
        lead: lead as Record<string, unknown>,
        socialUrls: social_urls,
      }),
      resolvedWebsiteUrl ? analyzeWebsite(resolvedWebsiteUrl) : Promise.resolve(null),
    ])

    const osintData: OsintResult | null =
      osintResult.status === 'fulfilled' ? osintResult.value : null
    const socialData: SocialAnalysisResult =
      socialResult.status === 'fulfilled' ? (socialResult.value ?? {}) : {}
    const websiteData: WebsiteAnalysisResult | null =
      websiteResult.status === 'fulfilled' ? websiteResult.value : null

    // Deduplicate emails across OSINT + website sources
    const allEmails = [...new Set([
      ...(osintData?.emails ?? []),
      ...(websiteData?.emails ?? []),
    ])]

    const insights = await generateInsights({
      lead: lead as Record<string, unknown>,
      osint: osintData,
      social: socialData,
      website: websiteData,
    })

    const suggestedOutreach = buildSuggestedOutreach(socialData, websiteData, allEmails)
    const updatedAt = new Date().toISOString()

    // Merge all intelligence into lead metadata
    const existingMeta = (lead.metadata as Record<string, unknown>) ?? {}
    await supabase
      .from('leads')
      .update({
        metadata: {
          ...existingMeta,
          osint: osintData,
          social_analysis: socialData,
          website_analysis: websiteData,
          intelligence_run_at: updatedAt,
        },
      })
      .eq('id', lead_id)

    await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/leads/intelligence' })

    return NextResponse.json({
      lead_id,
      contact: {
        emails: allEmails,
        phones: websiteData?.phones ?? [],
        decision_makers: osintData?.employees ?? [],
      },
      website_analysis: websiteData
        ? {
            has_menu: websiteData.has_menu,
            has_online_ordering: websiteData.has_online_ordering,
          }
        : null,
      social_analysis: socialData,
      insights,
      suggested_outreach: suggestedOutreach,
      updated_at: updatedAt,
    })
  } catch (err) {
    console.error('Intelligence pipeline error:', err)
    return NextResponse.json(
      {
        error: 'Intelligence pipeline failed',
        code: 'PIPELINE_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    await closeBrowser()
  }
}

async function generateInsights(params: {
  lead: Record<string, unknown>
  osint: OsintResult | null
  social: SocialAnalysisResult
  website: WebsiteAnalysisResult | null
}): Promise<{ pain_points: string[]; opportunity: string }> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a sales intelligence analyst. Based on lead data, identify business pain points and outreach opportunities. Be specific and concise.',
        },
        {
          role: 'user',
          content: `Analyze this lead and return JSON with "pain_points" (array of 2-3 short strings) and "opportunity" (1 sentence).
Lead: ${JSON.stringify({ name: params.lead.name, platform: params.lead.platform, bio: params.lead.bio, niche: params.lead.niche })}
Social: ${JSON.stringify(params.social)}
Website: ${JSON.stringify(params.website)}
OSINT tech_stack: ${JSON.stringify(params.osint?.tech_stack ?? [])}
Return only valid JSON, no markdown.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(text)
    return {
      pain_points: Array.isArray(result.pain_points) ? result.pain_points.slice(0, 3) : [],
      opportunity: typeof result.opportunity === 'string' ? result.opportunity : '',
    }
  } catch {
    return { pain_points: [], opportunity: '' }
  }
}

function buildSuggestedOutreach(
  social: SocialAnalysisResult,
  website: WebsiteAnalysisResult | null,
  emails: string[]
): { channel: string; message_angle: string; next_step: string } {
  let channel = 'instagram_dm'
  let nextStep = 'send_dm'

  if (social.instagram) {
    const ig = social.instagram
    if (ig.activity_level === 'high' || ig.activity_level === 'medium') {
      channel = 'instagram_dm'
      nextStep = ig.suggested_action === 'like_then_dm' ? 'like_recent_post_then_send_dm' : 'send_dm'
    } else if (emails.length > 0) {
      channel = 'email'
      nextStep = 'send_cold_email'
    }
  } else if (social.linkedin) {
    channel = 'linkedin_message'
    nextStep = 'send_connection_request_then_message'
  } else if (social.twitter) {
    channel = 'twitter_dm'
    nextStep = 'send_dm'
  } else if (emails.length > 0) {
    channel = 'email'
    nextStep = 'send_cold_email'
  } else if (website?.suggested_action === 'call_preferred') {
    channel = 'phone'
    nextStep = 'call_business'
  }

  return {
    channel,
    message_angle: 'personalized outreach based on business intelligence',
    next_step: nextStep,
  }
}

function extractDomain(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
