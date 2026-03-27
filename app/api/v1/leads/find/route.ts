import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, logUsage } from '@/lib/supabase-admin'
import { newPage, closeBrowser } from '@/lib/browser'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const Schema = z.object({
  area: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20),
  filters: z
    .object({
      no_website: z.boolean().optional(),
    })
    .optional()
    .default({}),
})

type MapsLead = {
  name: string
  email: string | null
  website: string | null
  area: string
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKeyId = request.headers.get('x-api-key-id')!

  // --- Parse body ---
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 }
    )
  }

  const parsed = Schema.safeParse(rawBody)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    if (fieldErrors.area) {
      return NextResponse.json(
        { error: 'area is required', code: 'MISSING_AREA' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { area, limit, filters } = parsed.data
  const supabase = createAdminClient()

  // --- Scrape Google Maps ---
  let leads: MapsLead[] = []
  try {
    const page = await newPage()
    try {
      leads = await scrapeGoogleMaps(page, { area, limit, filters })
    } finally {
      await page.close()
      await closeBrowser()
    }
  } catch (err) {
    console.error('Google Maps scrape error:', err)
    return NextResponse.json(
      {
        error: 'Scraping failed',
        code: 'SCRAPING_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }

  // --- Persist to Supabase ---
  // Map MapsLead → leads table schema
  let savedLeads: Record<string, unknown>[] = []

  if (leads.length > 0) {
    const rows = leads.map(lead => ({
      api_key_id: apiKeyId,
      platform: 'google_maps',
      name: lead.name,
      username: toSlug(lead.name),
      profile_url: lead.website,
      metadata: { email: lead.email, area: lead.area, source: 'google_maps' },
    }))

    const { data, error: dbErr } = await supabase
      .from('leads')
      .insert(rows)
      .select('id, name, username, profile_url, platform, metadata, created_at')

    if (dbErr) {
      console.error('DB insert error:', dbErr.message)
      // Return scraped results even if DB insert fails
      savedLeads = leads.map(l => ({
        name: l.name,
        website: l.website,
        area: l.area,
        platform: 'google_maps',
      }))
    } else if (data) {
      savedLeads = data
    }
  }

  await logUsage(supabase, { api_key_id: apiKeyId, endpoint: '/api/v1/leads/find' })

  return NextResponse.json({
    status: 'success',
    leads_found: savedLeads.length,
    leads: savedLeads,
  })
}

// ---------------------------------------------------------------------------
// Slug helper — derive a unique-ish username from a business name
// ---------------------------------------------------------------------------

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'unknown'
}

// ---------------------------------------------------------------------------
// Google Maps scraping
// ---------------------------------------------------------------------------

async function scrapeGoogleMaps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  params: { area: string; limit: number; filters: { no_website?: boolean } }
): Promise<MapsLead[]> {
  const { area, limit, filters } = params

  // Navigate to Maps search. Searching the area directly surfaces local businesses.
  const searchUrl =
    `https://www.google.com/maps/search/${encodeURIComponent(area)}`

  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30_000 })

  // Dismiss EU / cookie consent dialog if present
  await dismissConsent(page)

  // Wait for the results feed
  const feedEl = await page
    .waitForSelector('div[role="feed"]', { timeout: 15_000 })
    .catch(() => null)

  if (!feedEl) {
    throw new Error(`No results feed loaded for area "${area}". Google Maps may have changed its layout.`)
  }

  // Collect place detail URLs by scrolling the feed.
  // We fetch up to limit*2 to have headroom after filtering.
  const placeUrls = await collectPlaceUrls(page, limit * 2)

  if (placeUrls.length === 0) {
    throw new Error(`No business listings found for "${area}".`)
  }

  // Visit each place and extract details, applying filters as we go
  const leads: MapsLead[] = []

  for (const url of placeUrls) {
    if (leads.length >= limit) break

    let details: MapsLead | null = null
    try {
      details = await extractPlaceDetails(page, url, area)
    } catch (err) {
      // Non-fatal — skip this listing and continue
      console.warn('extractPlaceDetails failed:', url, (err as Error).message)
      continue
    }

    if (!details) continue

    // Apply no_website filter: skip businesses that DO have a website
    if (filters.no_website && details.website) continue

    leads.push(details)
  }

  return leads
}

// ---------------------------------------------------------------------------
// Scroll the results feed and collect place URLs
// ---------------------------------------------------------------------------

async function collectPlaceUrls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  target: number
): Promise<string[]> {
  const FEED = 'div[role="feed"]'
  const seen = new Set<string>()
  let staleScrolls = 0

  for (let attempt = 0; attempt < 20; attempt++) {
    // Collect all place links currently in the DOM
    const hrefs: string[] = await page.evaluate((feedSel: string) => {
      const feed = document.querySelector(feedSel)
      if (!feed) return []
      return Array.from(feed.querySelectorAll('a[href*="/maps/place/"]'))
        .map(a => (a as HTMLAnchorElement).href.split('?')[0])
        .filter(h => h.includes('/maps/place/'))
    }, FEED)

    const prevSize = seen.size
    hrefs.forEach(h => seen.add(h))

    if (seen.size >= target) break

    // Detect end-of-list
    const atEnd: boolean = await page.evaluate((feedSel: string) => {
      const feed = document.querySelector(feedSel)
      const text = feed?.textContent ?? ''
      return (
        text.includes("You've reached the end") ||
        text.includes('end of the list') ||
        text.includes("No more results")
      )
    }, FEED)

    if (atEnd) break

    // No new results after scroll → likely at end
    if (seen.size === prevSize) {
      staleScrolls++
      if (staleScrolls >= 3) break
    } else {
      staleScrolls = 0
    }

    // Scroll the feed panel
    await page.evaluate((feedSel: string) => {
      const feed = document.querySelector(feedSel)
      if (feed) feed.scrollTop = feed.scrollHeight
    }, FEED)

    await new Promise(r => setTimeout(r, 1_500))
  }

  return Array.from(seen).slice(0, target)
}

// ---------------------------------------------------------------------------
// Navigate to a place URL and extract structured data
// ---------------------------------------------------------------------------

async function extractPlaceDetails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  url: string,
  area: string
): Promise<MapsLead | null> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })

  // Wait for the business name heading
  await page.waitForSelector('h1', { timeout: 8_000 }).catch(() => null)

  // Brief wait for dynamic content (phone/website buttons)
  await new Promise(r => setTimeout(r, 600))

  return page.evaluate((area: string): MapsLead | null => {
    const name = document.querySelector('h1')?.textContent?.trim()
    if (!name) return null

    const websiteEl =
      document.querySelector<HTMLAnchorElement>('a[data-item-id="authority"]') ??
      document.querySelector<HTMLAnchorElement>('[aria-label^="Website:"] a') ??
      document.querySelector<HTMLAnchorElement>('[data-tooltip="Open website"]')

    let website: string | null = websiteEl?.href ?? null
    if (website?.startsWith('https://www.google.com/url?')) {
      try {
        website = new URL(website).searchParams.get('q')
      } catch {
        website = null
      }
    }

    return { name, email: null, website, area }
  }, area)
}

// ---------------------------------------------------------------------------
// Dismiss GDPR / cookie consent dialogs (EU regions)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dismissConsent(page: any): Promise<void> {
  try {
    await page.waitForSelector('form[action*="consent"]', { timeout: 3_000 })
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      const accept = buttons.find(b => /accept all|agree|i agree/i.test(b.textContent ?? ''))
      accept?.click()
    })
    await new Promise(r => setTimeout(r, 1_000))
  } catch {
    // No consent dialog — nothing to do
  }
}
