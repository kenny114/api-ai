import { newPage } from './browser'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

export interface OsintResult {
  emails: string[]
  employees: string[]
  subdomains: string[]
  tech_stack: string[]
}

export async function enrichOsint(params: {
  domain: string
  companyName: string
}): Promise<OsintResult> {
  const { domain } = params

  const [subdomains, websiteData] = await Promise.all([
    getSubdomains(domain),
    scrapeWebsiteForContacts(domain),
  ])

  return {
    emails: websiteData.emails,
    employees: websiteData.employees,
    subdomains,
    tech_stack: websiteData.tech_stack,
  }
}

async function getSubdomains(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ name_value: string }>
    const seen = new Set<string>()
    return data
      .flatMap(e => e.name_value.split('\n'))
      .map(s => s.trim().toLowerCase())
      .filter(s => s.endsWith(`.${domain}`) && !s.includes('*'))
      .filter(s => !seen.has(s) && !!seen.add(s))
      .slice(0, 20)
  } catch {
    return []
  }
}

async function scrapeWebsiteForContacts(domain: string): Promise<{
  emails: string[]
  employees: string[]
  tech_stack: string[]
}> {
  const page = await newPage()
  const emails = new Set<string>()
  const employees = new Set<string>()
  let tech_stack: string[] = []

  const pagesToVisit = [
    `https://${domain}`,
    `https://${domain}/contact`,
    `https://${domain}/about`,
    `https://${domain}/team`,
  ]

  try {
    for (const url of pagesToVisit) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        await new Promise(r => setTimeout(r, 500))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (page as any).evaluate(() => {
          const text = (document.body as HTMLElement)?.innerText ?? ''
          const html = document.documentElement.innerHTML
          const rawEmails = (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []) as string[]
          const mailtoEmails = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]'))
            .map(a => a.href.replace('mailto:', '').split('?')[0])
          const scripts = Array.from(document.scripts).map(s => s.src).filter(Boolean) as string[]
          const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? ''
          const nameEls = Array.from(document.querySelectorAll<HTMLElement>(
            'h2, h3, h4, [class*="name"], [class*="member"], [class*="person"]'
          )).map(el => el.textContent?.trim() ?? '').filter(Boolean).slice(0, 30) as string[]
          return { rawEmails, mailtoEmails, scripts, generator, nameEls, html: html.slice(0, 50_000) }
        })

        ;[...result.rawEmails, ...result.mailtoEmails].forEach((e: string) => emails.add(e.toLowerCase()))

        if (url === `https://${domain}` && tech_stack.length === 0) {
          tech_stack = detectTechStack(result.scripts, result.generator, result.html)
        }

        if (url.includes('/team') || url.includes('/about')) {
          result.nameEls
            .filter((n: string) => {
              const words = n.split(/\s+/)
              return words.length >= 2 && words.length <= 5 && n.length < 60
            })
            .forEach((n: string) => employees.add(n))
        }

        await new Promise(r => setTimeout(r, 700 + Math.random() * 400))
      } catch {
        // Skip unreachable pages
      }
    }
  } finally {
    await page.close()
  }

  const validEmails = Array.from(emails).filter(e => {
    if (!EMAIL_REGEX.test(e)) return false
    const local = e.split('@')[0]
    return !/noreply|no-reply|bounce|mailer-daemon|postmaster|webmaster|sentry|loaderio/.test(local)
  })

  return {
    emails: validEmails.slice(0, 10),
    employees: Array.from(employees).slice(0, 10),
    tech_stack,
  }
}

function detectTechStack(scripts: string[], generator: string, html: string): string[] {
  const stack = new Set<string>()
  const combined = [...scripts, generator, html.slice(0, 15_000)].join(' ').toLowerCase()

  const checks: [string | RegExp, string][] = [
    ['shopify', 'Shopify'],
    ['woocommerce', 'WooCommerce'],
    ['squarespace', 'Squarespace'],
    ['bigcommerce', 'BigCommerce'],
    ['magento', 'Magento'],
    [/wp-content|wp-includes|wordpress/, 'WordPress'],
    ['ghost.io', 'Ghost'],
    ['webflow', 'Webflow'],
    ['wix.com', 'Wix'],
    ['googletagmanager', 'Google Tag Manager'],
    ['google-analytics', 'Google Analytics'],
    ['hotjar', 'Hotjar'],
    ['klaviyo', 'Klaviyo'],
    ['hubspot', 'HubSpot'],
    ['intercom', 'Intercom'],
    ['stripe.com', 'Stripe'],
    ['paypal', 'PayPal'],
    ['cloudflare', 'Cloudflare'],
    ['amazonaws', 'AWS'],
    ['doordash', 'DoorDash'],
    ['ubereats', 'Uber Eats'],
    ['grubhub', 'Grubhub'],
  ]

  for (const [pattern, name] of checks) {
    if (typeof pattern === 'string' ? combined.includes(pattern) : pattern.test(combined)) {
      stack.add(name)
    }
  }

  return Array.from(stack)
}
