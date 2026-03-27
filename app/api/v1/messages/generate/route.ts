import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { generateOutreachMessage } from '@/lib/openai'

export const runtime = 'nodejs'

const GenerateSchema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  campaign_type: z.string().min(1).max(100).optional(),
  template: z
    .enum(['cold_outreach', 'follow_up', 'partnership', 'custom'])
    .default('cold_outreach'),
  custom_prompt: z.string().max(500).optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'direct']).default('friendly'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const apiKeyId = request.headers.get('x-api-key-id')!

  // --- Parse & validate ---
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 }
    )
  }

  const parsed = GenerateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { lead_id, campaign_type, template, custom_prompt, tone } = parsed.data
  const supabase = createAdminClient()

  // --- Fetch lead ---
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .eq('api_key_id', apiKeyId) // ensure ownership
    .single()

  if (leadError || !lead) {
    return NextResponse.json(
      { error: 'Lead not found', code: 'LEAD_NOT_FOUND' },
      { status: 404 }
    )
  }

  // --- Generate message ---
  let generatedMessage: string
  try {
    generatedMessage = await generateOutreachMessage({ lead, campaignType: campaign_type, template, customPrompt: custom_prompt, tone })
  } catch (err) {
    console.error('OpenAI error:', err)
    return NextResponse.json(
      {
        error: 'Message generation failed',
        code: 'GENERATION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }

  // --- Persist message ---
  const { data: savedMessage, error: dbError } = await supabase
    .from('messages')
    .insert({
      lead_id,
      api_key_id: apiKeyId,
      campaign_type: campaign_type ?? null,
      template,
      custom_prompt: custom_prompt ?? null,
      generated_message: generatedMessage,
      tone,
      model_used: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      status: 'draft',
    })
    .select()
    .single()

  if (dbError) {
    console.error('DB error saving message:', dbError.message)
  }

  // --- Log usage ---
  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/messages/generate' })

  return NextResponse.json({
    message_id: savedMessage?.id ?? null,
    message_text: generatedMessage,
    status: 'draft',
  })
}
