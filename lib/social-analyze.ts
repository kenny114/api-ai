import { newPage } from './browser'

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
    const page = await newPage()
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
      await page.close()
    }

    await new Promise(r => setTimeout(r, 1_000 + Math.random() * 1_000))
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeInstagram(page: any, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await new Promise(r => setTimeout(r, 2_000))

  const { isPrivate, followerRaw, postRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const isPrivate = /this account is private|account is private/i.test(text)
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/)
    const postMatch = text.match(/([\d,.]+[KkMm]?)\s*posts?/i)
    return {
      isPrivate,
      followerRaw: followerMatch?.[1] ?? null,
      postRaw: postMatch?.[1] ?? null,
    }
  })

  const followers = parseCount(followerRaw)
  const totalPosts = parseCount(postRaw)
  // Rough monthly estimate assuming posts spread over ~1 year
  const postsLastMonth = totalPosts !== null ? Math.min(Math.round(totalPosts / 12), 30) : null
  const activityLevel = isPrivate ? 'private' : calcActivityLevel(postsLastMonth)

  return {
    followers,
    posts_last_month: postsLastMonth,
    engagement_rate: null, // Requires auth to access likes/comments
    activity_level: activityLevel,
    is_private: isPrivate,
    is_inactive: postsLastMonth === 0,
    suggested_action: suggestAction(followers, activityLevel, isPrivate, postsLastMonth === 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeTwitter(page: any, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await new Promise(r => setTimeout(r, 2_000))

  const { isPrivate, followerRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const isPrivate = /protected|tweets are protected/i.test(text)
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/)
    return { isPrivate, followerRaw: followerMatch?.[1] ?? null }
  })

  const followers = parseCount(followerRaw)
  const activityLevel: PlatformAnalysis['activity_level'] = isPrivate ? 'private' : 'unknown'

  return {
    followers,
    posts_last_month: null,
    engagement_rate: null,
    activity_level: activityLevel,
    is_private: isPrivate,
    is_inactive: false,
    suggested_action: suggestAction(followers, activityLevel, isPrivate, false),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeLinkedIn(page: any, url: string): Promise<PlatformAnalysis> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await new Promise(r => setTimeout(r, 2_000))

  const { followerRaw } = await page.evaluate(() => {
    const text = (document.body as HTMLElement)?.innerText ?? ''
    const followerMatch = text.match(/([\d,.]+[KkMm]?)\s*followers/i)
    return { followerRaw: followerMatch?.[1] ?? null }
  })

  const followers = parseCount(followerRaw)
  const activityLevel: PlatformAnalysis['activity_level'] =
    followers !== null ? (followers > 500 ? 'medium' : 'low') : 'unknown'

  return {
    followers,
    posts_last_month: null,
    engagement_rate: null,
    activity_level: activityLevel,
    is_private: false,
    is_inactive: false,
    suggested_action: suggestAction(followers, activityLevel, false, false),
  }
}
