import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { newPage, closeBrowser, injectSessionCookies } from '@/lib/browser'
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
      status: scheduled_at ? 'pending' : 'pending',
      sent_at: null,
    })
    .select()
    .single()

  const logId = outreachLog?.id

  // --- Handle scheduled send ---
  if (scheduled_at) {
    // In production, push to a queue (e.g. Inngest, BullMQ, Upstash QStash)
    // For now, persist as pending and return
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

  // --- Send immediately via Puppeteer ---
  let status: 'sent' | 'failed' = 'failed'
  let errorMsg: string | null = null
  let sentAt: string | null = null

  try {
    const page = await newPage()
    try {
      await sendMessage(page, {
        platform: lead.platform as Platform,
        profileUrl: lead.profile_url as string,
        username: lead.username as string,
        messageText: message.generated_message as string,
        apiKeyId,
      })
      status = 'sent'
      sentAt = new Date().toISOString()
    } finally {
      await page.close()
      await closeBrowser()
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Send error:', err)
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
  apiKeyId: string
}

async function sendMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  params: SendParams
): Promise<void> {
  switch (params.platform) {
    case 'instagram':
      return sendInstagramDM(page, params)
    case 'twitter':
      return sendTwitterDM(page, params)
    case 'linkedin':
      return sendLinkedInMessage(page, params)
  }
}

async function sendInstagramDM(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  { username, messageText, apiKeyId }: SendParams
): Promise<void> {
  await injectSessionCookies(page, 'instagram', apiKeyId)
  // 1. Navigate to the user's profile
  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  })

  // 2. Click the "Message" button on their profile
  // Instagram renders this as a plain DIV with no aria-label — find by text content
  await new Promise(r => setTimeout(r, 2_000))
  const messageBtn = await page.evaluateHandle(() => {
    const els = Array.from(document.querySelectorAll('div, button'))
    return els.find(el =>
      el.textContent?.trim() === 'Message' &&
      !el.querySelector('*') === false || el.textContent?.trim() === 'Message'
    ) ?? null
  })

  const msgBtnEl = messageBtn.asElement()
  if (!msgBtnEl) {
    throw new Error('Instagram: Message button not found. Is the session cookie set?')
  }

  await msgBtnEl.click()
  await new Promise(r => setTimeout(r, 3_000))

  // 3. Type and send the message — DM composer input
  const inputBox = await page
    .waitForSelector('div[contenteditable="true"][role="textbox"], textarea[placeholder]', { timeout: 10_000 })
    .catch(() => null)

  if (!inputBox) throw new Error('Instagram: DM input not found')

  await inputBox.click()
  await inputBox.type(messageText, { delay: 30 })

  // Press Enter to send
  await page.keyboard.press('Enter')
  await new Promise(r => setTimeout(r, 2_000))
}

async function sendTwitterDM(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  { username, messageText, apiKeyId }: SendParams
): Promise<void> {
  await injectSessionCookies(page, 'twitter', apiKeyId)
  await page.goto(`https://twitter.com/messages/compose?recipient_id=@${username}`, {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  })

  const input = await page
    .waitForSelector('[data-testid="dmComposerTextInput"]', { timeout: 8_000 })
    .catch(() => null)

  if (!input) throw new Error('Twitter: DM input not found. Is the auth token set?')

  await input.click()
  await input.type(messageText, { delay: 30 })

  const sendBtn = await page.$('[data-testid="dmComposerSendButton"]')
  if (!sendBtn) throw new Error('Twitter: Send button not found')
  await sendBtn.click()
  await new Promise(r => setTimeout(r, 2_000))
}

async function sendLinkedInMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  { profileUrl, messageText, apiKeyId }: SendParams
): Promise<void> {
  await injectSessionCookies(page, 'linkedin', apiKeyId)
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30_000 })

  const msgBtn = await page
    .waitForSelector('[aria-label^="Message"]', { timeout: 8_000 })
    .catch(() => null)

  if (!msgBtn) throw new Error('LinkedIn: Message button not found. Is the li_at cookie set?')

  await msgBtn.click()

  const input = await page
    .waitForSelector('.msg-form__contenteditable', { timeout: 8_000 })
    .catch(() => null)

  if (!input) throw new Error('LinkedIn: Message input not found')

  await input.click()
  await input.type(messageText, { delay: 30 })

  const sendBtn = await page.$('.msg-form__send-button')
  if (!sendBtn) throw new Error('LinkedIn: Send button not found')
  await sendBtn.click()
  await new Promise(r => setTimeout(r, 2_000))
}
