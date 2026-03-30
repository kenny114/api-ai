import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import type { Platform } from '@/types'
import { createAdminClient } from '@/lib/supabase-admin'
import { decrypt } from '@/lib/encrypt'

let _browser: Browser | null = null

export async function getBrowserPw(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser

  if (process.env.BROWSER_WS_ENDPOINT) {
    _browser = await chromium.connectOverCDP(process.env.BROWSER_WS_ENDPOINT)
    return _browser
  }

  _browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  return _browser
}

export async function newContextPw(platform?: Platform, apiKeyId?: string): Promise<BrowserContext> {
  const browser = await getBrowserPw()
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  })

  if (platform && apiKeyId) {
    await injectSessionCookiesPw(ctx, platform, apiKeyId)
  }

  return ctx
}

export async function closeBrowserPw(): Promise<void> {
  if (_browser) {
    await _browser.close().catch(() => {})
    _browser = null
  }
}

/**
 * Inject the platform session cookie into a Playwright BrowserContext.
 * Resolution order:
 *   1. Encrypted credential from platform_credentials table (per API key)
 *   2. Server env var fallback (owner's own accounts)
 */
export async function injectSessionCookiesPw(
  ctx: BrowserContext,
  platform: Platform,
  apiKeyId?: string
): Promise<void> {
  const decode = (v: string) => { try { return decodeURIComponent(v) } catch { return v } }

  let rawValue: string | null = null

  if (apiKeyId) {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('platform_credentials')
        .select('credential_enc')
        .eq('api_key_id', apiKeyId)
        .eq('platform', platform)
        .single()
      if (data?.credential_enc) rawValue = decrypt(data.credential_enc)
    } catch {
      // fall through to env var
    }
  }

  if (!rawValue) {
    if (platform === 'instagram') rawValue = process.env.IG_SESSION_COOKIE ?? null
    else if (platform === 'twitter') rawValue = process.env.TWITTER_AUTH_TOKEN ?? null
    else if (platform === 'linkedin') rawValue = process.env.LI_AT_COOKIE ?? null
  }

  if (!rawValue) {
    throw new Error(
      `No credential found for platform "${platform}". ` +
      `Store one via POST /api/v1/credentials or set the server env var.`
    )
  }

  const val = decode(rawValue)

  if (platform === 'instagram') {
    await ctx.addCookies([
      { name: 'sessionid', value: val, domain: '.instagram.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' },
    ])
  } else if (platform === 'twitter') {
    await ctx.addCookies([
      { name: 'auth_token', value: val, domain: '.twitter.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' },
      { name: 'auth_token', value: val, domain: '.x.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' },
    ])
  } else if (platform === 'linkedin') {
    await ctx.addCookies([
      { name: 'li_at', value: val, domain: '.linkedin.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' },
    ])
  }
}
