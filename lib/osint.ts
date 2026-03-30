import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

const execFileAsync = promisify(execFile)

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
const SPAM_EMAIL_PREFIXES = /noreply|no-reply|bounce|mailer-daemon|postmaster|webmaster|sentry|loaderio/

export interface OsintResult {
  emails: string[]
  employees: string[]
  subdomains: string[]
  tech_stack: string[]
}

interface HarvesterJson {
  emails?: string[]
  hosts?: string[] | Array<{ hostname: string; ip: string }>
  linkedin_people?: string[]
  people?: string[]
  cmd?: string
}

export async function enrichOsint(params: {
  domain: string
  companyName: string
}): Promise<OsintResult> {
  const { domain } = params

  // Run theHarvester sources in parallel with rate-limit delay between calls
  const [bingResult, duckResult, crtResult] = await Promise.allSettled([
    runHarvester(domain, 'bing', 50),
    runHarvester(domain, 'duckduckgo', 50),
    runHarvester(domain, 'crtsh', 100),
  ])

  const results: HarvesterJson[] = []
  for (const r of [bingResult, duckResult, crtResult]) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value)
  }

  // Merge emails
  const emailSet = new Set<string>()
  for (const r of results) {
    for (const e of r.emails ?? []) {
      const clean = e.toLowerCase().trim()
      if (isValidEmail(clean)) emailSet.add(clean)
    }
  }

  // Merge subdomains from hosts field
  const subdomainSet = new Set<string>()
  for (const r of results) {
    for (const h of r.hosts ?? []) {
      const hostname = typeof h === 'string' ? h : h.hostname
      const clean = hostname.toLowerCase().trim()
      if (clean.endsWith(`.${domain}`) && !clean.includes('*')) {
        subdomainSet.add(clean)
      }
    }
  }

  // Merge employees from linkedin_people + people
  const employeeSet = new Set<string>()
  for (const r of results) {
    for (const p of [...(r.linkedin_people ?? []), ...(r.people ?? [])]) {
      const clean = p.trim()
      const words = clean.split(/\s+/)
      if (words.length >= 2 && words.length <= 5 && clean.length < 60) {
        employeeSet.add(clean)
      }
    }
  }

  // Tech stack from crt.sh is not available via theHarvester — detect via DNS/HTTP headers
  const tech_stack = await detectTechStack(domain)

  return {
    emails: Array.from(emailSet).slice(0, 10),
    employees: Array.from(employeeSet).slice(0, 10),
    subdomains: Array.from(subdomainSet).slice(0, 20),
    tech_stack,
  }
}

async function runHarvester(domain: string, source: string, limit: number): Promise<HarvesterJson | null> {
  const tmpDir = os.tmpdir()
  const outFile = path.join(tmpDir, `harvest_${domain}_${source}_${Date.now()}`)

  try {
    // Rate-limit: small delay between source calls to avoid IP blocking
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000))

    await execFileAsync(
      'python3',
      ['-m', 'theHarvester', '-d', domain, '-b', source, '-l', String(limit), '-f', outFile],
      { timeout: 60_000 }
    )

    const jsonPath = outFile + '.json'
    try {
      const raw = await fs.readFile(jsonPath, 'utf-8')
      await fs.unlink(jsonPath).catch(() => {})
      return JSON.parse(raw) as HarvesterJson
    } catch {
      return null
    }
  } catch (err) {
    console.warn(`theHarvester [${source}] failed for ${domain}:`, err instanceof Error ? err.message : err)
    return null
  } finally {
    // Clean up any leftover files
    for (const ext of ['.json', '.xml', '']) {
      await fs.unlink(outFile + ext).catch(() => {})
    }
  }
}

async function detectTechStack(domain: string): Promise<string[]> {
  const stack = new Set<string>()
  try {
    const res = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    })
    const headers = Object.fromEntries(res.headers.entries())
    const html = await res.text().catch(() => '')
    const combined = [
      headers['x-powered-by'] ?? '',
      headers['server'] ?? '',
      headers['x-generator'] ?? '',
      html.slice(0, 20_000),
    ].join(' ').toLowerCase()

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
      ['google workspace', 'Google Workspace'],
      ['gsuite', 'Google Workspace'],
    ]

    for (const [pattern, name] of checks) {
      if (typeof pattern === 'string' ? combined.includes(pattern) : pattern.test(combined)) {
        stack.add(name)
      }
    }
  } catch {
    // Ignore — tech stack detection is best-effort
  }
  return Array.from(stack)
}

function isValidEmail(email: string): boolean {
  if (!EMAIL_REGEX.test(email)) return false
  const local = email.split('@')[0]
  return !SPAM_EMAIL_PREFIXES.test(local)
}
