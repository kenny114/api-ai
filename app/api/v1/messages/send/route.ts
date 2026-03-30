import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { newContextPw, closeBrowserPw } from '@/lib/browser-playwright'
import type { Page } from 'playwright'
import type { Platform } from '@/types'

export const runtime = 'nodejs'

const SendSchema = z.object({
  message_id: z.string().uuid(),
  // scheduled_at: ISO string for future sends; null = send immediately
  scheduled_at: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
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

  const parsed = SendSchema.safeParse(rawBody)
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

  const { message_id, scheduled_at } = parsed.data
  const supabase = createAdminClient()

  // --- Fetch message + lead ---
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('*, leads(*)')
    .eq('id', message_id)
    .eq('api_key_id', apiKeyId)
    .single()

  if (msgError || !message) {
    return NextResponse.json(
      { error: 'Message not found', code: 'MESSAGE_NOT_FOUND' },
      { status: 404 }
    )
  }

  const lead = message.leads as Record<string, unknown>

  // --- Create outreach log (pending) ---
  const { data: outreachLog } = await supabase
    .from('outreach_logs')
    .insert({
      message_id,
      lead_id: message.lead_id,
      api_key_id: apiKeyId,
      platform: lead.platform as Platform,
      status: 'pending',
      sent_at: null,
    })
    .select()
    .single()

  const logId = outreachLog?.id

  // --- Handle scheduled send ---
  if (scheduled_at) {
    await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/messages/send' })

    return NextResponse.json(
      {
        log_id: logId,
        status: 'queued',
        scheduled_at,
        message: 'Message queued. Connect a job queue (Inngest/QStash) to process scheduled sends.',
      },
      { status: 202 }
    )
  }

  // --- Send immediately via Playwright ---
  let status: 'sent' | 'failed' = 'failed'
  let errorMsg: string | null = null
  let sentAt: string | null = null

  const platform = lead.platform as Platform
  const ctx = await newContextPw(platform, apiKeyId)
  const page = await ctx.newPage()

  // Block images/media for speed while keeping JS and XHR
  await page.route('**/*.{png,jpg,jpeg,gif,webp,mp4,svg,woff,woff2,ttf}', route => route.abort())

  try {
    await sendMessage(page, {
      platform,
      profileUrl: lead.profile_url as string,
      username: lead.username as string,
      messageText: message.generated_message as string,
    })
    status = 'sent'
    sentAt = new Date().toISOString()
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Send error:', err)
  } finally {
    await page.close().catch(() => {})
    await ctx.close().catch(() => {})
    await closeBrowserPw()
  }

  // --- Update outreach log ---
  await supabase
    .from('outreach_logs')
    .update({ status, sent_at: sentAt, error: errorMsg })
    .eq('id', logId)

  // --- Log usage ---
  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/messages/send' })

  if (status === 'failed') {
    return NextResponse.json(
      {
        log_id: logId,
        status: 'failed',
        error: errorMsg,
        code: 'SEND_FAILED',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    log_id: logId,
    status: 'sent',
    sent_at: sentAt,
    platform: lead.platform,
    username: lead.username,
  })
}

// ---------------------------------------------------------------------------
// Platform send helpers
// ---------------------------------------------------------------------------

interface SendParams {
  platform: Platform
  profileUrl: string
  username: string
  messageText: string
}

async function sendMessage(page: Page, params: SendParams): Promise<void> {
  switch (params.platform) {
    case 'instagram':
      return sendInstagramDM(page, params)
    case 'twitter':
      return sendTwitterDM(page, params)
    case 'linkedin':
      return sendLinkedInMessage(page, params)
  }
}

async function sendInstagramDM(page: Page, { username, messageText }: SendParams): Promise<void> {
  // Cookies already injected into context before page was created
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

  // Wait for profile to load, then find the Message button
  await page.waitForTimeout(2_000)

  const messageBtn = page.getByRole('button', { name: /^message$/i })
    .or(page.locator('div, button').filter({ hasText: /^Message$/ }).first())

  await messageBtn.waitFor({ timeout: 10_000 })
  await messageBtn.click()

  await page.waitForTimeout(3_000)

  // DM composer input
  const inputBox = page
    .locator('div[contenteditable="true"][role="textbox"], textarea[placeholder]')
    .first()

  await inputBox.waitFor({ timeout: 10_000 })
  await inputBox.click()
  await inputBox.type(messageText, { delay: 30 })

  await page.keyboard.press('Enter')
  await page.waitForTimeout(2_000)
}

async function sendTwitterDM(page: Page, { username, messageText }: SendParams): Promise<void> {
  await page.goto(`https://twitter.com/messages/compose?recipient_id=@${username}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

  const input = page.locator('[data-testid="dmComposerTextInput"]')
  await input.waitFor({ timeout: 8_000 })
  await input.click()
  await input.type(messageText, { delay: 30 })

  const sendBtn = page.locator('[data-testid="dmComposerSendButton"]')
  await sendBtn.waitFor({ timeout: 8_000 })
  await sendBtn.click()

  await page.waitForTimeout(2_000)
}

async function sendLinkedInMessage(page: Page, { profileUrl, messageText }: SendParams): Promise<void> {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const msgBtn = page.locator('[aria-label^="Message"]').first()
  await msgBtn.waitFor({ timeout: 8_000 })
  await msgBtn.click()

  const input = page.locator('.msg-form__contenteditable').first()
  await input.waitFor({ timeout: 8_000 })
  await input.click()
  await input.type(messageText, { delay: 30 })

  const sendBtn = page.locator('.msg-form__send-button').first()
  await sendBtn.waitFor({ timeout: 8_000 })
  await sendBtn.click()

  await page.waitForTimeout(2_000)
}
