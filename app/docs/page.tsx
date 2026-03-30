import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference — LeadAPI',
  description: 'Full documentation for the LeadAPI REST API.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="code-block">
      <code>{children}</code>
    </pre>
  )
}

function Badge({ method }: { method: string }) {
  return (
    <span className="text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded">
      {method}
    </span>
  )
}

function EndpointCard({
  id,
  method,
  path,
  description,
  request,
  response,
}: {
  id: string
  method: string
  path: string
  description: string
  request: string
  response: string
}) {
  return (
    <div id={id} className="border border-zinc-800 rounded-xl overflow-hidden scroll-mt-24">
      <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3 mb-2">
          <Badge method={method} />
          <code className="text-sm font-mono text-zinc-200">{path}</code>
        </div>
        <p className="text-zinc-400 text-sm">{description}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Request</p>
          <Code>{request}</Code>
        </div>
        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Response</p>
          <Code>{response}</Code>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar sections
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'authentication',   label: 'Authentication'     },
  { id: 'errors',           label: 'Errors'             },
  { id: 'leads-find',       label: 'Find Leads'         },
  { id: 'osint-enrich',     label: 'OSINT Enrich'       },
  { id: 'social-analyze',   label: 'Social Analyze'     },
  { id: 'website-analyze',  label: 'Website Analyze'    },
  { id: 'intelligence',     label: 'Intelligence'       },
  { id: 'messages-gen',     label: 'Generate Message'   },
  { id: 'messages-send',    label: 'Send Message'       },
  { id: 'credentials',      label: 'Credentials'        },
  { id: 'quickstart',       label: 'Quick start'        },
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

      <div className="pt-16 flex mx-auto max-w-7xl min-h-screen">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0 border-r border-zinc-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-5">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-4">Reference</p>
          <nav className="space-y-0.5">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800/50 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <article className="flex-1 px-8 py-10 max-w-4xl space-y-14">
          {/* Auth */}
          <section id="authentication" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4">Authentication</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              All API requests must include your key in the{' '}
              <code className="text-violet-400 font-mono text-xs bg-violet-950/30 px-1.5 py-0.5 rounded">
                x-api-key
              </code>{' '}
              header. Keys start with <code className="text-violet-400 font-mono text-xs">sk_live_</code>.
            </p>
            <Code>{`curl https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json"`}</Code>
          </section>

          {/* Errors */}
          <section id="errors" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4">Errors</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              All errors return a JSON body with <code className="text-violet-400 font-mono text-xs">error</code> and{' '}
              <code className="text-violet-400 font-mono text-xs">code</code> fields.
            </p>
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Code</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {[
                    ['401', 'MISSING_API_KEY',  'No x-api-key header provided'],
                    ['401', 'INVALID_API_KEY',  'Key not found in database'],
                    ['429', 'LIMIT_EXCEEDED',   'Request limit reached for this key'],
                    ['400', 'VALIDATION_ERROR', 'Request body failed validation'],
                    ['503', 'AUTH_ERROR',        'Supabase is unreachable'],
                  ].map(([status, code, meaning]) => (
                    <tr key={code} className="hover:bg-zinc-900/20">
                      <td className="px-4 py-2.5 font-mono text-zinc-300">{status}</td>
                      <td className="px-4 py-2.5 font-mono text-violet-400 text-xs">{code}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Endpoints */}
          <section id="leads-find" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-6">Endpoints</h2>
            <EndpointCard
              id="leads-find"
              method="POST"
              path="/api/v1/leads/find"
              description="Scrape business listings from Google Maps for a given area or niche. Returns saved lead records."
              request={`{
  "area": "coffee shops London",  // search query passed to Google Maps
  "limit": 10,                    // 1–50, default 20
  "filters": {
    "no_website": true            // if true, only return businesses without a website
  }
}`}
              response={`{
  "status": "success",
  "leads_found": 3,
  "leads": [
    {
      "id": "a1b2c3d4-...",
      "name": "Hideaway Coffee House",
      "username": "hideaway_coffee_house",
      "profile_url": "https://hideawaycoffee.com",
      "platform": "google_maps",
      "metadata": {
        "email": null,
        "area": "coffee shops London",
        "source": "google_maps"
      },
      "created_at": "2024-03-15T14:23:01Z"
    }
  ]
}`}
            />
          </section>

          <EndpointCard
            id="osint-enrich"
            method="POST"
            path="/api/v1/leads/osint-enrich"
            description="Enrich a lead with publicly available data — emails, employee names, subdomains, and tech stack detected from their website and certificate logs."
            request={`{
  "lead_id": "a1b2c3d4-...",       // required — UUID from leads/find
  "domain": "joespizza.com",       // optional — overrides lead's profile_url domain
  "company_name": "Joe's Pizza"    // optional — overrides lead's name
}`}
            response={`{
  "lead_id": "a1b2c3d4-...",
  "emails": ["owner@joespizza.com", "info@joespizza.com"],
  "employees": ["Joe Smith", "Mary Lopez"],
  "subdomains": ["mail.joespizza.com", "api.joespizza.com"],
  "tech_stack": ["Shopify", "Google Tag Manager", "Stripe"],
  "updated_at": "2026-03-29T15:12:00Z"
}`}
          />

          <EndpointCard
            id="social-analyze"
            method="POST"
            path="/api/v1/leads/social-analyze"
            description="Visit a lead's social profiles to extract followers, activity level, and get a suggested outreach action."
            request={`{
  "lead_id": "a1b2c3d4-...",                    // required
  "social_urls": [                               // optional — overrides lead's profile_url
    "https://instagram.com/joespizza"
  ],
  "platform": "instagram"                        // optional — instagram | twitter | linkedin
}`}
            response={`{
  "lead_id": "a1b2c3d4-...",
  "social_analysis": {
    "instagram": {
      "followers": 4500,
      "posts_last_month": 4,
      "engagement_rate": null,
      "activity_level": "low",
      "suggested_action": "like_then_dm",
      "is_private": false,
      "is_inactive": false
    }
  },
  "updated_at": "2026-03-29T15:18:00Z"
}`}
          />

          <EndpointCard
            id="website-analyze"
            method="POST"
            path="/api/v1/leads/website-analyze"
            description="Visit a lead's website to extract contact info, detect menu/ordering pages, and suggest the best outreach channel."
            request={`{
  "lead_id": "a1b2c3d4-...",           // required
  "url": "https://joespizza.com"        // optional — overrides lead's profile_url
}`}
            response={`{
  "lead_id": "a1b2c3d4-...",
  "website_analysis": {
    "emails": ["info@joespizza.com"],
    "phones": ["555-123-4567"],
    "has_menu": true,
    "has_online_ordering": false,
    "suggested_action": "email_or_dm"
  },
  "updated_at": "2026-03-29T15:22:00Z"
}`}
          />

          <EndpointCard
            id="intelligence"
            method="POST"
            path="/api/v1/leads/intelligence"
            description="Run the full intelligence pipeline — OSINT enrichment, social analysis, and website analysis in one call. Returns a combined report with AI-generated insights and outreach recommendations."
            request={`{
  "lead_id": "a1b2c3d4-...",                    // required
  "domain": "joespizza.com",                    // optional overrides
  "company_name": "Joe's Pizza",
  "social_urls": ["https://instagram.com/joespizza"],
  "website_url": "https://joespizza.com"
}`}
            response={`{
  "lead_id": "a1b2c3d4-...",
  "contact": {
    "emails": ["info@joespizza.com", "owner@joespizza.com"],
    "phones": ["555-123-4567"],
    "decision_makers": ["Joe Smith"]
  },
  "website_analysis": {
    "has_menu": true,
    "has_online_ordering": false
  },
  "social_analysis": {
    "instagram": {
      "followers": 4500,
      "activity_level": "low",
      "suggested_action": "like_then_dm"
    }
  },
  "insights": {
    "pain_points": ["low social activity", "no online ordering"],
    "opportunity": "Help them drive more orders through Instagram"
  },
  "suggested_outreach": {
    "channel": "instagram_dm",
    "message_angle": "personalized outreach based on business intelligence",
    "next_step": "like_recent_post_then_send_dm"
  },
  "updated_at": "2026-03-29T15:30:00Z"
}`}
          />

          <EndpointCard
            id="messages-gen"
            method="POST"
            path="/api/v1/messages/generate"
            description="Generate a personalised outreach message for a lead using AI."
            request={`{
  "lead_id": "a1b2c3d4-...",             // required — UUID from leads/find
  "template": "cold_outreach",           // cold_outreach | follow_up | partnership | custom
  "campaign_type": "promotion",          // optional — describe the campaign
  "tone": "friendly",                    // professional | casual | friendly | direct
  "custom_prompt": "Mention their menu"  // optional — extra instructions for AI
}`}
            response={`{
  "message_id": "e5f6g7h8-...",
  "message_text": "Hey Hideaway Coffee House! Your cozy vibe...",
  "status": "draft"
}`}
          />

          <EndpointCard
            id="messages-send"
            method="POST"
            path="/api/v1/messages/send"
            description="Send an approved message via platform automation. Optionally schedule for later."
            request={`{
  "message_id": "e5f6g7h8-...",
  "scheduled_at": null       // ISO string or null to send immediately
}`}
            response={`{
  "log_id": "i9j0k1l2-...",
  "status": "sent",
  "sent_at": "2024-03-15T14:23:01Z",
  "platform": "instagram",
  "username": "johnfitness"
}`}
          />

          <EndpointCard
            id="credentials"
            method="POST"
            path="/api/v1/credentials"
            description="Store encrypted platform credentials (session tokens) for a key. Required before sending messages."
            request={`{
  "platform": "instagram",   // instagram | twitter | linkedin
  "value": "your-session-token"
}`}
            response={`{
  "platform": "instagram",
  "status": "saved"
}`}
          />

          {/* Quick start */}
          <section id="quickstart" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4">Quick start</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Five API calls to go from zero to sent DM — with full intelligence on every lead.
            </p>
            <Code>{`# 1. Find leads (Google Maps)
curl -X POST https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"area":"pizza shops Austin TX","limit":5}'

# 2. Run full intelligence pipeline (use lead_id from step 1)
#    → OSINT + social analysis + website analysis + AI insights in one call
curl -X POST https://your-app.vercel.app/api/v1/leads/intelligence \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>"}'

# 3. Generate a personalised message (use lead_id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/messages/generate \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>","template":"cold_outreach","tone":"friendly"}'

# 4. Send it (use message_id from step 3)
curl -X POST https://your-app.vercel.app/api/v1/messages/send \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message_id":"<id>"}'`}</Code>
          </section>
        </article>
      </div>
    </>
  )
}
