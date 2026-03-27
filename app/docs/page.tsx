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
  { id: 'authentication', label: 'Authentication' },
  { id: 'errors',         label: 'Errors'         },
  { id: 'leads-find',     label: 'Find Leads'     },
  { id: 'messages-gen',   label: 'Generate Message' },
  { id: 'messages-send',  label: 'Send Message'   },
  { id: 'credentials',    label: 'Credentials'    },
  { id: 'quickstart',     label: 'Quick start'    },
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
                    ['429', 'LIMIT_EXCEEDED',   'Monthly request limit reached'],
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
              description="Scrape and return matching lead profiles from a given platform and niche."
              request={`{
  "platform": "instagram",   // instagram | twitter | linkedin | google_maps
  "niche": "fitness coaches",
  "limit": 10,               // max profiles to return
  "filters": {
    "min_followers": 5000,
    "max_followers": 100000,
    "location": "US"
  }
}`}
              response={`{
  "leads": [
    {
      "id": "a1b2c3d4-...",
      "username": "johnfitness",
      "name": "John Smith",
      "profile_url": "https://instagram.com/johnfitness",
      "bio": "Online coach. Helping 500+ clients...",
      "followers": 24800,
      "platform": "instagram",
      "niche": "fitness coaches"
    }
  ],
  "count": 10,
  "credits_used": 1
}`}
            />
          </section>

          <EndpointCard
            id="messages-gen"
            method="POST"
            path="/api/v1/messages/generate"
            description="Generate a personalised outreach message for a lead using AI."
            request={`{
  "lead_id": "a1b2c3d4-...",
  "campaign_type": "promotion",
  "tone": "friendly"         // professional | casual | friendly | direct
}`}
            response={`{
  "message_id": "e5f6g7h8-...",
  "message_text": "Hey John! Loved your recent content...",
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
  "token": "your-session-token"
}`}
            response={`{
  "ok": true,
  "platform": "instagram"
}`}
          />

          {/* Quick start */}
          <section id="quickstart" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4">Quick start</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Three API calls to go from zero to sent DM.
            </p>
            <Code>{`# 1. Find leads
curl -X POST https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"platform":"instagram","niche":"fitness coaches","limit":5}'

# 2. Generate a message (use lead_id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/messages/generate \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>","campaign_type":"promotion","tone":"friendly"}'

# 3. Send it (use message_id from step 2)
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
