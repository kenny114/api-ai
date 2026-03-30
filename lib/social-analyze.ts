import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

export type SocialPlatform = 'instagram' | 'twitter' | 'linkedin'

export interface PlatformAnalysis {
  followers: number | null
  posts_last_month: number | null
  engagement_rate: number | null
  activity_level: 'high' | 'medium' | 'low' | 'inactive' | 'private' | 'unknown'
  suggested_action: 'send_dm' | 'email_preferred' | 'skip' | 'like_then_dm'
  is_private: boolean
  is_inactive: boolean
}

export type SocialAnalysisResult = Partial<Record<SocialPlatform, PlatformAnalysis>>

let _browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    })
  }
  return _browser
}

async function newContext(): Promise<BrowserContext> {
  const browser = await getBrowser()
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Simulate human-like browser fingerprint
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
}

export async function closeSocialBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close().catch(() => {})
    _browser = null
  }
}

export async function analyzeSocialProfiles(params: {
  lead: Record<string, unknown>
  socialUrls?: string[]
  platform?: SocialPlatform
}): Promise<SocialAnalysisResult> {
  const { lead, socialUrls, platform } = params
  const result: SocialAnalysisResult = {}

  const targets: { platform: SocialPlatform; url: string }[] = []

  if (socialUrls?.length) {
    for (const url of socialUrls) {
      const detected = detectPlatform(url)
      if (detected && (!platform || detected === platform)) {
        targets.push({ platform: detected, url })
      }
    }
  }

  // Fall back to lead's own profile_url
  if (targets.length === 0 && lead.profile_url && lead.platform) {
    const p = lead.platform as SocialPlatform
    if (['instagram', 'twitter', 'linkedin'].includes(p)) {
      targets.push({ platform: p, url: lead.profile_url as string })
    }
  }

  for (const target of targets) {
    const ctx = await newContext()
    const page = await ctx.newPage()

    // Block images/media to speed up loads, simulate human browsing
    await page.route('**/*.{png,jpg,jpeg,gif,webp,mp4,svg,woff,woff2,ttf}', route => route.abort())

    try {
      let analysis: PlatformAnalysis
      if (target.platform === 'instagram') {
        analysis = await analyzeInstagram(page, target.url)
      } else if (target.platform === 'twitter') {
        analysis = await analyzeTwitter(page, target.url)
      } else {
        analysis = await analyzeLinkedIn(page, target.url)
      }
      result[target.platform] = analysis
    } catch {
      result[target.platform] = unknownAnalysis()
    } finally {
      await page.close().catch(() => {})
      await ctx.close().catch(() => {})
    }

    // Rate-limit between platform requests to avoid bans
    await new Promise(r => setTimeout(r, 2_000 + Math.random() * 2_000))
  }

  return result
}

function detectPlatform(url: string): SocialPlatform | null {
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('linkedin.com')) return 'linkedin'
  return null
}

function unknownAnalysis(): PlatformAnalysis {
  return {
    followers: null,
    posts_last_month: null,
    engagement_rate: null,
    activity_level: 'unknown',
    suggested_action: 'skip',
    is_private: false,
    is_inactive: false,
  }
}

function calcActivityLevel(postsLastMonth: number | null): PlatformAnalysis['activity_level'] {
  if (postsLastMonth === null) return 'unknown'
  if (postsLastMonth === 0) return 'inactive'
  if (postsLastMonth >= 8) return 'high'
  if (postsLastMonth >= 3) return 'medium'
  return 'low'
}

function suggestAction(
  followers: number | null,
  activityLevel: string,
  isPrivate: boolean,
  isInactive: boolean
): PlatformAnalysis['suggested_action'] {
  if (isPrivate || isInactive) return 'email_preferred'
  if (activityLevel === 'high' && (followers ?? 0) > 1_000) return 'send_dm'
  if (activityLevel === 'medium') return 'like_then_dm'
  if (activityLevel === 'low') return 'email_preferred'
  return 'skip'
}

function parseCount(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = raw.replace(/,/g, '').trim()
  const lower = s.toLowerCase()
  if (lower.endsWith('k')) return Math.round(parseFloat(s) * 1_000)
  if (lower.endsWith('m')) return Math.round(parseFloat(s) * 1_000_000)
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

async function analyzeInstagram(page: Page, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })

  // Human-like delay before reading content
  await page.waitForTimeout(2_000 + Math.random() * 1_000)

  const { isPrivate, followerRaw, postRaw, likeRaw, commentRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const isPrivate = /this account is private|account is private/i.test(text)
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/)
    const postMatch = text.match(/([\d,.]+[KkMm]?)\s*posts?/i)
    // Engagement: try to find likes and comments on recent posts from meta tags
    const likeMatch = text.match(/(\d[\d,.]*[KkMm]?)\s*likes?/i)
    const commentMatch = text.match(/(\d[\d,.]*[KkMm]?)\s*comments?/i)
    return {
      isPrivate,
      followerRaw: followerMatch?.[1] ?? null,
      postRaw: postMatch?.[1] ?? null,
      likeRaw: likeMatch?.[1] ?? null,
      commentRaw: commentMatch?.[1] ?? null,
    }
  })

  const followers = parseCount(followerRaw)
  const totalPosts = parseCount(postRaw)
  const postsLastMonth = totalPosts !== null ? Math.min(Math.round(totalPosts / 12), 30) : null
  const activityLevel = isPrivate ? 'private' : calcActivityLevel(postsLastMonth)

  // Estimate engagement rate from visible like/comment counts
  let engagementRate: number | null = null
  if (followers && followers > 0) {
    const likes = parseCount(likeRaw) ?? 0
    const comments = parseCount(commentRaw) ?? 0
    if (likes > 0 || comments > 0) {
      engagementRate = Math.round(((likes + comments) / followers) * 1000) / 1000
    }
  }

  return {
    followers,
    posts_last_month: postsLastMonth,
    engagement_rate: engagementRate,
    activity_level: activityLevel,
    is_private: isPrivate,
    is_inactive: postsLastMonth === 0,
    suggested_action: suggestAction(followers, activityLevel, isPrivate, postsLastMonth === 0),
  }
}

async function analyzeTwitter(page: Page, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await page.waitForTimeout(2_000 + Math.random() * 1_000)

  const { isPrivate, followerRaw, followingRaw, tweetCountRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const isPrivate = /protected|tweets are protected/i.test(text)
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/)
    const followingMatch = text.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowing/)
    const tweetMatch = text.match(/([\d,.]+[KkMm]?)\s*[Tt]weets?/)
    return {
      isPrivate,
      followerRaw: followerMatch?.[1] ?? null,
      followingRaw: followingMatch?.[1] ?? null,
      tweetCountRaw: tweetMatch?.[1] ?? null,
    }
  })

  const followers = parseCount(followerRaw)
  const totalTweets = parseCount(tweetCountRaw)
  // Rough monthly estimate: assume account age ~2 years
  const postsLastMonth = totalTweets !== null ? Math.min(Math.round(totalTweets / 24), 60) : null
  const activityLevel: PlatformAnalysis['activity_level'] = isPrivate
    ? 'private'
    : calcActivityLevel(postsLastMonth)

  return {
    followers,
    posts_last_month: postsLastMonth,
    engagement_rate: null,
    activity_level: activityLevel,
    is_private: isPrivate,
    is_inactive: postsLastMonth === 0,
    suggested_action: suggestAction(followers, activityLevel, isPrivate, postsLastMonth === 0),
  }
}

async function analyzeLinkedIn(page: Page, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await page.waitForTimeout(2_000 + Math.random() * 1_000)

  const { followerRaw, postCountRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*followers/i)
    const postMatch = text.match(/([\d,.]+[KkMm]?)\s*posts?/i)
    return {
      followerRaw: followerMatch?.[1] ?? null,
      postCountRaw: postMatch?.[1] ?? null,
    }
  })

  const followers = parseCount(followerRaw)
  const totalPosts = parseCount(postCountRaw)
  const postsLastMonth = totalPosts !== null ? Math.min(Math.round(totalPosts / 12), 30) : null
  const activityLevel: PlatformAnalysis['activity_level'] =
    postsLastMonth !== null ? calcActivityLevel(postsLastMonth) :
    followers !== null ? (followers > 500 ? 'medium' : 'low') : 'unknown'

  return {
    followers,
    posts_last_month: postsLastMonth,
    engagement_rate: null,
    activity_level: activityLevel,
    is_private: false,
    is_inactive: postsLastMonth === 0,
    suggested_action: suggestAction(followers, activityLevel, false, postsLastMonth === 0),
  }
}
