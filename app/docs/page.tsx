'use client'

import { useState } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = { label: string; lang: string; code: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CodeBlock({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0d0d]">
      {tabs.length > 1 && (
        <div className="flex border-b border-zinc-800">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                i === active
                  ? 'text-white border-b-2 border-violet-500 -mb-px bg-zinc-900/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <pre className="p-5 text-sm text-zinc-300 overflow-x-auto leading-relaxed">
        <code>{tabs[active].code}</code>
      </pre>
    </div>
  )
}

function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    POST: 'bg-violet-600/20 text-violet-400 border border-violet-600/30',
    GET:  'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${colors[method] ?? colors.POST}`}>
      {method}
    </span>
  )
}

function Endpoint({
  id,
  method,
  path,
  description,
  params,
  tabs,
}: {
  id: string
  method: string
  path: string
  description: string
  params?: { name: string; type: string; required?: boolean; desc: string }[]
  tabs: Tab[]
}) {
  return (
    <div id={id} className="scroll-mt-24 py-12 border-b border-zinc-800/60 last:border-0">
      <div className="flex items-center gap-3 mb-3">
        <Badge method={method} />
        <code className="text-sm font-mono text-zinc-100">{path}</code>
      </div>
      <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-2xl">{description}</p>

      {params && params.length > 0 && (
        <div className="mb-6 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Parameters</span>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {params.map(p => (
              <div key={p.name} className="px-4 py-3 flex items-start gap-4">
                <div className="min-w-[140px]">
                  <code className="text-xs text-violet-400">{p.name}</code>
                  {p.required && (
                    <span className="ml-1.5 text-[10px] text-rose-400 font-medium">required</span>
                  )}
                </div>
                <code className="text-xs text-zinc-500 min-w-[60px]">{p.type}</code>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <CodeBlock tabs={tabs} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-0 pt-10 pb-4 border-b border-zinc-800/60">
        {title}
      </h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Nav sections
// ---------------------------------------------------------------------------

const NAV = [
  { id: 'authentication', label: 'Authentication' },
  { id: 'errors',         label: 'Errors' },
  { id: 'mcp',            label: 'MCP Server' },
  { label: '—', id: '', disabled: true },
  { id: 'leads-find',      label: 'Find Leads' },
  { id: 'osint-enrich',    label: 'OSINT Enrich' },
  { id: 'social-analyze',  label: 'Social Analyze' },
  { id: 'website-analyze', label: 'Website Analyze' },
  { id: 'intelligence',    label: 'Intelligence' },
  { label: '—', id: '', disabled: true },
  { id: 'messages-gen',    label: 'Generate Message' },
  { id: 'messages-send',   label: 'Send Message' },
  { id: 'credentials',     label: 'Credentials' },
  { label: '—', id: '', disabled: true },
  { id: 'quickstart',      label: 'Quick start' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <>
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-white font-semibold tracking-tight">
            Lead<span className="text-violet-400">API</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link
              href="/dashboard"
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16 flex mx-auto max-w-6xl min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-zinc-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-4 px-2">API Reference</p>
          <nav className="space-y-0.5">
            {NAV.map((s, i) =>
              (s as { disabled?: boolean }).disabled ? (
                <div key={i} className="my-2 border-t border-zinc-800/60" />
              ) : (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block px-2 py-1.5 text-sm text-zinc-500 hover:text-white rounded-md hover:bg-zinc-800/40 transition-colors"
                >
                  {s.label}
                </a>
              )
            )}
          </nav>
        </aside>

        {/* Main */}
        <article className="flex-1 px-10 py-10 max-w-3xl">

          {/* Auth */}
          <section id="authentication" className="scroll-mt-24 py-12 border-b border-zinc-800/60">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Authentication</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-2xl">
              Pass your key in the{' '}
              <code className="text-violet-400 font-mono text-xs bg-violet-950/30 px-1.5 py-0.5 rounded">x-api-key</code>{' '}
              header. Keys start with <code className="text-violet-400 font-mono text-xs">sk_live_</code>.
            </p>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  lang: 'bash',
                  code: `curl https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json"`,
                },
                {
                  label: 'Node',
                  lang: 'js',
                  code: `const res = await fetch('https://your-app.vercel.app/api/v1/leads/find', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ area: 'coffee shops London', limit: 10 }),
})
const data = await res.json()`,
                },
                {
                  label: 'Python',
                  lang: 'python',
                  code: `import requests

res = requests.post(
    'https://your-app.vercel.app/api/v1/leads/find',
    headers={'x-api-key': 'sk_live_YOUR_KEY'},
    json={'area': 'coffee shops London', 'limit': 10},
)
data = res.json()`,
                },
              ]}
            />
          </section>

          {/* Errors */}
          <section id="errors" className="scroll-mt-24 py-12 border-b border-zinc-800/60">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Errors</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              All errors return a JSON body with <code className="text-violet-400 font-mono text-xs">error</code> and{' '}
              <code className="text-violet-400 font-mono text-xs">code</code> fields.
            </p>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Code</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {[
                    ['401', 'MISSING_API_KEY',  'No x-api-key header provided'],
                    ['401', 'INVALID_API_KEY',  'Key not found in database'],
                    ['429', 'LIMIT_EXCEEDED',   'Request limit reached for this key'],
                    ['400', 'VALIDATION_ERROR', 'Request body failed validation'],
                    ['503', 'AUTH_ERROR',        'Supabase is unreachable'],
                  ].map(([status, code, meaning]) => (
                    <tr key={code}>
                      <td className="px-4 py-3 font-mono text-zinc-300">{status}</td>
                      <td className="px-4 py-3 font-mono text-violet-400 text-xs">{code}</td>
                      <td className="px-4 py-3 text-zinc-400">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* MCP */}
          <section id="mcp" className="scroll-mt-24 py-12 border-b border-zinc-800/60">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">MCP Server</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-3 max-w-2xl">
              LeadAPI ships an MCP server so AI assistants like{' '}
              <strong className="text-zinc-200">Claude Desktop</strong>,{' '}
              <strong className="text-zinc-200">Cursor</strong>, and{' '}
              <strong className="text-zinc-200">Windsurf</strong> can call your API directly — no code needed.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Download <code className="text-violet-400 font-mono text-xs">mcp-server.ts</code> from the repo root,
              then add this block to your AI assistant&apos;s config file.
            </p>
            <CodeBlock
              tabs={[
                {
                  label: 'Claude Desktop',
                  lang: 'json',
                  code: `// ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "leadapi": {
      "command": "npx",
      "args": ["ts-node", "/path/to/mcp-server.ts"],
      "env": {
        "LEADAPI_KEY": "sk_live_YOUR_KEY",
        "LEADAPI_BASE": "https://your-app.vercel.app"
      }
    }
  }
}`,
                },
                {
                  label: 'Cursor / Windsurf',
                  lang: 'json',
                  code: `// .cursor/mcp.json  (or .windsurf/mcp.json)
{
  "mcpServers": {
    "leadapi": {
      "command": "npx",
      "args": ["ts-node", "/path/to/mcp-server.ts"],
      "env": {
        "LEADAPI_KEY": "sk_live_YOUR_KEY",
        "LEADAPI_BASE": "https://your-app.vercel.app"
      }
    }
  }
}`,
                },
              ]}
            />
            <div className="mt-4 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800">
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Available MCP Tools</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {[
                  ['leads_find',            'Scrape Google Maps leads for a niche/area'],
                  ['leads_osint_enrich',    'Enrich a lead with emails, employees, tech stack'],
                  ['leads_social_analyze',  'Analyze social profile activity and suggest action'],
                  ['leads_website_analyze', 'Extract contact info and social links from website'],
                  ['leads_intelligence',    'Full pipeline: OSINT + social + website + AI insights'],
                  ['messages_generate',     'AI-generate a personalised outreach message'],
                  ['messages_send',         'Send a message via platform automation'],
                  ['credentials_save',      'Store encrypted platform session credentials'],
                ].map(([tool, desc]) => (
                  <div key={tool} className="px-4 py-3 flex items-start gap-4">
                    <code className="text-xs text-violet-400 min-w-[200px] shrink-0">{tool}</code>
                    <p className="text-xs text-zinc-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Endpoints */}
          <Section title="Leads">
            <Endpoint
              id="leads-find"
              method="POST"
              path="/api/v1/leads/find"
              description="Scrape business listings from Google Maps for a given area or niche. Returns saved lead records."
              params={[
                { name: 'area',            type: 'string',  required: true,  desc: 'Search query passed to Google Maps, e.g. "coffee shops London"' },
                { name: 'limit',           type: 'number',                   desc: '1–50, default 20' },
                { name: 'filters.no_website', type: 'boolean',               desc: 'If true, only return businesses with no website' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/leads/find

{
  "area": "coffee shops London",
  "limit": 10,
  "filters": { "no_website": true }
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "status": "success",
  "leads_found": 1,
  "leads": [
    {
      "id": "a1b2c3d4-...",
      "name": "Hideaway Coffee House",
      "platform": "google_maps",
      "profile_url": "https://hideawaycoffee.com",
      "metadata": {
        "email": null,
        "area": "coffee shops London"
      },
      "created_at": "2024-03-15T14:23:01Z"
    }
  ]
}`,
                },
              ]}
            />

            <Endpoint
              id="osint-enrich"
              method="POST"
              path="/api/v1/leads/osint-enrich"
              description="Enrich a lead with publicly available data — emails, employee names, subdomains, and tech stack."
              params={[
                { name: 'lead_id',      type: 'string', required: true, desc: 'UUID from leads/find' },
                { name: 'domain',       type: 'string',                 desc: 'Overrides domain from profile_url' },
                { name: 'company_name', type: 'string',                 desc: 'Overrides lead name for OSINT queries' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/leads/osint-enrich

{
  "lead_id": "a1b2c3d4-...",
  "domain": "joespizza.com",
  "company_name": "Joe's Pizza"
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "lead_id": "a1b2c3d4-...",
  "emails": ["owner@joespizza.com", "info@joespizza.com"],
  "employees": ["Joe Smith", "Mary Lopez"],
  "subdomains": ["mail.joespizza.com", "api.joespizza.com"],
  "tech_stack": ["Shopify", "Google Tag Manager", "Stripe"],
  "updated_at": "2026-03-29T15:12:00Z"
}`,
                },
              ]}
            />

            <Endpoint
              id="social-analyze"
              method="POST"
              path="/api/v1/leads/social-analyze"
              description="Visit a lead's social profiles to extract followers, activity level, and get a suggested outreach action."
              params={[
                { name: 'lead_id',     type: 'string',   required: true, desc: 'UUID from leads/find' },
                { name: 'social_urls', type: 'string[]',                 desc: 'Optional — social URLs to visit (overrides lead\'s profile_url)' },
                { name: 'platform',    type: 'string',                   desc: 'instagram | twitter | linkedin' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/leads/social-analyze

{
  "lead_id": "a1b2c3d4-...",
  "social_urls": ["https://instagram.com/joespizza"],
  "platform": "instagram"
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "lead_id": "a1b2c3d4-...",
  "social_analysis": {
    "instagram": {
      "followers": 4500,
      "posts_last_month": 4,
      "activity_level": "low",
      "suggested_action": "like_then_dm",
      "is_private": false
    }
  },
  "updated_at": "2026-03-29T15:18:00Z"
}`,
                },
              ]}
            />

            <Endpoint
              id="website-analyze"
              method="POST"
              path="/api/v1/leads/website-analyze"
              description="Visit a lead's website to extract contact info, detect menu/ordering pages, find social links, and suggest the best outreach channel."
              params={[
                { name: 'lead_id', type: 'string', required: true, desc: 'UUID from leads/find' },
                { name: 'url',     type: 'string',                 desc: 'Overrides lead\'s profile_url' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/leads/website-analyze

{
  "lead_id": "a1b2c3d4-...",
  "url": "https://joespizza.com"
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "lead_id": "a1b2c3d4-...",
  "website_analysis": {
    "emails": ["info@joespizza.com"],
    "phones": ["555-123-4567"],
    "has_menu": true,
    "has_online_ordering": false,
    "suggested_action": "email_or_dm",
    "social_links": {
      "instagram": "https://instagram.com/joespizza",
      "facebook": "https://facebook.com/joespizza"
    }
  },
  "updated_at": "2026-03-29T15:22:00Z"
}`,
                },
              ]}
            />

            <Endpoint
              id="intelligence"
              method="POST"
              path="/api/v1/leads/intelligence"
              description="Run the full intelligence pipeline — OSINT + social + website analysis in one call. Returns AI-generated insights and outreach recommendations."
              params={[
                { name: 'lead_id',      type: 'string',   required: true, desc: 'UUID from leads/find' },
                { name: 'domain',       type: 'string',                   desc: 'Optional domain override' },
                { name: 'company_name', type: 'string',                   desc: 'Optional company name override' },
                { name: 'social_urls',  type: 'string[]',                 desc: 'Optional social profile URLs' },
                { name: 'website_url',  type: 'string',                   desc: 'Optional website URL override' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/leads/intelligence

{
  "lead_id": "a1b2c3d4-..."
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "lead_id": "a1b2c3d4-...",
  "contact": {
    "emails": ["info@joespizza.com"],
    "phones": ["555-123-4567"],
    "decision_makers": ["Joe Smith"]
  },
  "social_analysis": {
    "instagram": { "followers": 4500, "activity_level": "low" }
  },
  "insights": {
    "pain_points": ["low social activity", "no online ordering"],
    "opportunity": "Help them drive more orders through Instagram"
  },
  "suggested_outreach": {
    "channel": "instagram_dm",
    "next_step": "like_recent_post_then_send_dm"
  },
  "updated_at": "2026-03-29T15:30:00Z"
}`,
                },
              ]}
            />
          </Section>

          <Section title="Messages">
            <Endpoint
              id="messages-gen"
              method="POST"
              path="/api/v1/messages/generate"
              description="Generate a personalised outreach message for a lead using AI."
              params={[
                { name: 'lead_id',       type: 'string', required: true, desc: 'UUID from leads/find' },
                { name: 'template',      type: 'string', required: true, desc: 'cold_outreach | follow_up | partnership | custom' },
                { name: 'tone',          type: 'string', required: true, desc: 'professional | casual | friendly | direct' },
                { name: 'campaign_type', type: 'string',                 desc: 'Describe the campaign (e.g. "promotion")' },
                { name: 'custom_prompt', type: 'string',                 desc: 'Extra instructions for the AI' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/messages/generate

{
  "lead_id": "a1b2c3d4-...",
  "template": "cold_outreach",
  "tone": "friendly",
  "custom_prompt": "Mention their menu"
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "message_id": "e5f6g7h8-...",
  "message_text": "Hey Hideaway Coffee House! Your cozy vibe...",
  "status": "draft"
}`,
                },
              ]}
            />

            <Endpoint
              id="messages-send"
              method="POST"
              path="/api/v1/messages/send"
              description="Send an approved message via platform automation. Optionally schedule for later."
              params={[
                { name: 'message_id',   type: 'string', required: true, desc: 'UUID from messages/generate' },
                { name: 'scheduled_at', type: 'string',                 desc: 'ISO 8601 datetime, or omit to send immediately' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/messages/send

{
  "message_id": "e5f6g7h8-...",
  "scheduled_at": null
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "log_id": "i9j0k1l2-...",
  "status": "sent",
  "sent_at": "2024-03-15T14:23:01Z",
  "platform": "instagram",
  "username": "johnfitness"
}`,
                },
              ]}
            />
          </Section>

          <Section title="Credentials">
            <Endpoint
              id="credentials"
              method="POST"
              path="/api/v1/credentials"
              description="Store encrypted platform credentials (session tokens) for a key. Required before sending messages."
              params={[
                { name: 'platform', type: 'string', required: true, desc: 'instagram | twitter | linkedin' },
                { name: 'value',    type: 'string', required: true, desc: 'Session token or cookie value' },
              ]}
              tabs={[
                {
                  label: 'Request',
                  lang: 'json',
                  code: `POST /api/v1/credentials

{
  "platform": "instagram",
  "value": "your-session-token"
}`,
                },
                {
                  label: 'Response',
                  lang: 'json',
                  code: `{
  "platform": "instagram",
  "status": "saved"
}`,
                },
              ]}
            />
          </Section>

          {/* Quick start */}
          <section id="quickstart" className="scroll-mt-24 py-12">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Quick start</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Four API calls to go from zero to sent DM — with full intelligence on every lead.
            </p>
            <CodeBlock
              tabs={[
                {
                  label: 'cURL',
                  lang: 'bash',
                  code: `# 1. Find leads
curl -X POST https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"area":"pizza shops Austin TX","limit":5}'

# 2. Run full intelligence (use lead_id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/leads/intelligence \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>"}'

# 3. Generate a personalised message
curl -X POST https://your-app.vercel.app/api/v1/messages/generate \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>","template":"cold_outreach","tone":"friendly"}'

# 4. Send it
curl -X POST https://your-app.vercel.app/api/v1/messages/send \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message_id":"<id>"}'`,
                },
                {
                  label: 'Node',
                  lang: 'js',
                  code: `const BASE = 'https://your-app.vercel.app'
const KEY  = 'sk_live_YOUR_KEY'
const h    = { 'x-api-key': KEY, 'Content-Type': 'application/json' }
const post = (path, body) =>
  fetch(BASE + path, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(r => r.json())

// 1. Find leads
const { leads } = await post('/api/v1/leads/find', { area: 'pizza shops Austin TX', limit: 5 })
const lead_id = leads[0].id

// 2. Intelligence
await post('/api/v1/leads/intelligence', { lead_id })

// 3. Generate message
const { message_id } = await post('/api/v1/messages/generate', {
  lead_id, template: 'cold_outreach', tone: 'friendly',
})

// 4. Send
await post('/api/v1/messages/send', { message_id })`,
                },
              ]}
            />
          </section>
        </article>
      </div>
    </>
  )
}
