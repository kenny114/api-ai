import type { Browser, Page, Protocol } from 'puppeteer-core'
import type { Platform } from '@/types'
import { createAdminClient } from '@/lib/supabase-admin'
import { decrypt } from '@/lib/encrypt'

let _browser: Browser | null = null

/**
 * Returns a shared Browser instance.
 *
 * Priority:
 * 1. BROWSER_WS_ENDPOINT env var → connect to a remote browser (e.g. Browserless.io)
 * 2. Running on Vercel → use @sparticuz/chromium
 * 3. Local dev → use the bundled puppeteer Chromium
 */
export async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser

  // Remote browser (Browserless, BrightData, etc.)
  if (process.env.BROWSER_WS_ENDPOINT) {
    const puppeteer = await import('puppeteer-core')
    _browser = await puppeteer.default.connect({
      browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
    })
    return _browser
  }

  // Serverless / Vercel production
  if (process.env.VERCEL || process.env.USE_SERVERLESS_CHROMIUM) {
    const puppeteer = await import('puppeteer-core')
    const chromium = await import('@sparticuz/chromium')
    _browser = await puppeteer.default.launch({
      executablePath: await chromium.default.executablePath(),
      args: chromium.default.args,
      headless: chromium.default.headless,
    })
    return _browser
  }

  // Local development — uses puppeteer's bundled Chromium
  const puppeteer = await import('puppeteer')
  _browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }) as unknown as Browser
  return _browser
}

export async function newPage(): Promise<Page> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/122.0.0.0 Safari/537.36'
  )
  await page.setViewport({ width: 1280, height: 800 })

  // Block images, fonts, and stylesheets to speed up scraping
  await page.setRequestInterception(true)
  page.on('request', req => {
    const type = req.resourceType()
    if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
      req.abort()
    } else {
      req.continue()
    }
  })

  return page
}

/**
 * Gracefully close the shared browser.
 * Call this at the end of serverless functions to avoid zombie processes.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close()
    _browser = null
  }
}

/**
 * Inject the platform session cookie so Puppeteer acts as a logged-in user.
 *
 * Resolution order:
 *   1. If apiKeyId is provided, look up an encrypted credential in platform_credentials.
 *   2. Fall back to server env vars (owner's own accounts):
 *      IG_SESSION_COOKIE   — Instagram `sessionid` cookie value
 *      TWITTER_AUTH_TOKEN  — Twitter/X `auth_token` cookie value
 *      LI_AT_COOKIE        — LinkedIn `li_at` cookie value
 */
export async function injectSessionCookies(
  page: Page,
  platform: Platform,
  apiKeyId?: string
): Promise<void> {
  type CookieDef = Omit<Protocol.Network.CookieParam, 'name' | 'value'> & {
    name: string
    value: string
  }

  // DevTools copies cookie values URL-encoded (%3A etc.) — decode to raw value
  const decode = (v: string) => { try { return decodeURIComponent(v) } catch { return v } }

  // --- Resolve credential value ---
  let rawValue: string | null = null

  // 1. Per-customer credential from DB
  if (apiKeyId) {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('platform_credentials')
        .select('credential_enc')
        .eq('api_key_id', apiKeyId)
        .eq('platform', platform)
        .single()

      if (data?.credential_enc) {
        rawValue = decrypt(data.credential_enc)
      }
    } catch {
      // DB lookup failed — fall through to env var fallback
    }
  }

  // 2. Owner env var fallback
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
  const cookies: CookieDef[] = []

  if (platform === 'instagram') {
    cookies.push({ name: 'sessionid', value: val, domain: '.instagram.com', path: '/', httpOnly: true, secure: true })
  } else if (platform === 'twitter') {
    cookies.push({ name: 'auth_token', value: val, domain: '.twitter.com', path: '/', httpOnly: true, secure: true })
    cookies.push({ name: 'auth_token', value: val, domain: '.x.com', path: '/', httpOnly: true, secure: true })
  } else if (platform === 'linkedin') {
    cookies.push({ name: 'li_at', value: val, domain: '.linkedin.com', path: '/', httpOnly: true, secure: true })
  }

  if (cookies.length > 0) {
    await page.setCookie(...cookies)
  }
}
