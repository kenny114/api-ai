import { newPage } from './browser'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

export interface WebsiteAnalysisResult {
  emails: string[]
  phones: string[]
  has_menu: boolean
  has_online_ordering: boolean
  suggested_action: 'email_or_dm' | 'call_preferred' | 'dm_only' | 'skip'
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
  const page = await newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    await new Promise(r => setTimeout(r, 1_500))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (page as any).evaluate(() => {
      const text = (document.body as HTMLElement)?.innerText ?? ''
      const html = document.documentElement.innerHTML.toLowerCase()

      const emailsFromText = (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []) as string[]
      const emailsFromMailto = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0])
      const phones = (text.match(/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g) ?? []) as string[]

      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map(a => ({
        href: a.href.toLowerCase(),
        text: a.textContent?.trim().toLowerCase() ?? '',
      }))

      const hasMenu =
        links.some(l => l.href.includes('menu') || /\bmenu\b/.test(l.text)) ||
        html.includes('our menu') ||
        html.includes('view menu')

      const hasOrdering =
        links.some(l =>
          /order\s*now|order\s*online|add\s*to\s*cart|buy\s*now|checkout/.test(l.text) ||
          l.href.includes('/order') ||
          l.href.includes('/cart')
        ) ||
        /doordash|ubereats|grubhub|seamless|postmates/.test(html)

      return { emailsFromText, emailsFromMailto, phones, hasMenu, hasOrdering }
    })

    const allEmails = [...new Set([...data.emailsFromText, ...data.emailsFromMailto])]
      .map((e: string) => e.toLowerCase())
      .filter((e: string) => {
        if (!EMAIL_REGEX.test(e)) return false
        const local = e.split('@')[0]
        return !/noreply|no-reply|example|sentry|wordpress|loaderio/.test(local)
      })

    const allPhones = [...new Set(data.phones as string[])].filter(
      (p: string) => p.replace(/\D/g, '').length >= 10
    )

    return {
      emails: allEmails.slice(0, 5),
      phones: allPhones.slice(0, 3),
      has_menu: data.hasMenu,
      has_online_ordering: data.hasOrdering,
      suggested_action: determineSuggestedAction(allEmails, allPhones),
    }
  } finally {
    await page.close()
  }
}

function determineSuggestedAction(
  emails: string[],
  phones: string[]
): WebsiteAnalysisResult['suggested_action'] {
  if (emails.length > 0) return 'email_or_dm'
  if (phones.length > 0) return 'call_preferred'
  return 'dm_only'
}
