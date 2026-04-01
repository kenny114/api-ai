import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'LeadAPI — Automated Outreach at Scale',
}

// ---------------------------------------------------------------------------
// Code snippet helpers
// ---------------------------------------------------------------------------

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="code-block">
      <code>{children}</code>
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Page sections
// ---------------------------------------------------------------------------

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold tracking-tight text-lg">
          Lead<span className="text-violet-400">API</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="/docs" className="hover:text-white transition-colors">Docs</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#for-agents" className="hover:text-white transition-colors">Agents</a>
          <a
            href="/dashboard"
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Get API Key
          </a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-36 pb-20 px-6 text-center">
      <div className="mx-auto max-w-3xl">
        <span className="inline-block bg-violet-900/40 text-violet-300 text-xs font-medium px-3 py-1 rounded-full border border-violet-800 mb-6">
          The go-to API for building business systems
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
          Automate your outreach
          <br />
          <span className="text-violet-400">end to end</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Find leads across platforms, generate personalised messages with AI,
          and send them automatically — all via a simple REST API built for scale.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="#get-started"
            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Start for free
          </a>
          <a
            href="/docs"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            View docs
          </a>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Find & Enrich Leads',
      desc: 'Scrape Google Maps for local businesses. Then run the full intelligence pipeline — OSINT emails, social stats, website contact info, and AI-generated insights in one call.',
      endpoint: 'POST /api/v1/leads/find + /leads/intelligence',
    },
    {
      step: '02',
      title: 'Generate Message',
      desc: 'Pass a lead ID. GPT-4o-mini writes a personalised outreach message tailored to their business, social presence, and your chosen tone and template.',
      endpoint: 'POST /api/v1/messages/generate',
    },
    {
      step: '03',
      title: 'Send It',
      desc: 'Pass a message ID. We automate DM delivery via Instagram, Twitter/X, or LinkedIn using browser automation. Send immediately or schedule for later.',
      endpoint: 'POST /api/v1/messages/send',
    },
  ]

  return (
    <section className="py-20 px-6 border-t border-zinc-800">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-white text-center mb-16">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(s => (
            <div key={s.step} className="relative">
              <div className="text-5xl font-black text-zinc-800 mb-4 select-none">{s.step}</div>
              <h3 className="text-white font-semibold text-xl mb-2">{s.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{s.desc}</p>
              <code className="text-xs text-violet-400 font-mono bg-violet-950/30 px-2 py-1 rounded border border-violet-900">
                {s.endpoint}
              </code>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EndpointCard({
  method,
  path,
  description,
  request,
  response,
}: {
  method: string
  path: string
  description: string
  request: string
  response: string
}) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded">
            {method}
          </span>
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

function Endpoints() {
  return (
    <section id="endpoints" className="py-20 px-6 border-t border-zinc-800">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">API Reference</h2>
          <p className="text-zinc-400">
            Authenticate every request with{' '}
            <code className="text-violet-400 text-sm font-mono">x-api-key: sk_live_...</code>
          </p>
        </div>
        <div className="space-y-8">
          <EndpointCard
            method="POST"
            path="/api/v1/leads/find"
            description="Scrape Google Maps for local businesses. Returns structured lead records saved to your database."
            request={`{
  "area": "pizza restaurants New York",
  "limit": 10,
  "filters": { "no_website": true }
}`}
            response={`{
  "status": "ok",
  "leads_found": 10,
  "leads": [
    {
      "id": "a1b2c3d4-...",
      "name": "Joe's Pizza",
      "username": "joes_pizza",
      "profile_url": "https://joespizza.com",
      "platform": "google_maps"
    }
  ]
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/leads/intelligence"
            description="Full pipeline: OSINT enrichment + social analysis + website analysis + AI insights in one call."
            request={`{
  "lead_id": "a1b2c3d4-..."
}`}
            response={`{
  "contact": {
    "emails": ["owner@joespizza.com"],
    "phones": ["+1-212-555-0100"]
  },
  "insights": {
    "pain_points": ["No loyalty program"],
    "opportunity": "Social media growth"
  },
  "suggested_outreach": {
    "channel": "instagram",
    "message_angle": "Local visibility"
  }
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/messages/generate"
            description="Generate a personalised outreach message for a lead using GPT-4o-mini."
            request={`{
  "lead_id": "a1b2c3d4-...",
  "template": "cold_outreach",
  "tone": "friendly",
  "campaign_type": "promotion"
}`}
            response={`{
  "message_id": "e5f6g7h8-...",
  "message_text": "Hey Joe! Love what you're doing
with Joe's Pizza. We help local restaurants
grow their online presence — think you'd be
a perfect fit. Mind if I share some details?",
  "status": "draft"
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/messages/send"
            description="Send an approved message via Instagram DM, Twitter DM, or LinkedIn automation. Requires saved credentials."
            request={`{
  "message_id": "e5f6g7h8-...",
  "scheduled_at": null
}`}
            response={`{
  "log_id": "i9j0k1l2-...",
  "status": "sent",
  "sent_at": "2026-04-01T14:23:01Z",
  "platform": "instagram",
  "username": "joespizzanyc"
}`}
          />
        </div>

        {/* Quick start code */}
        <div className="mt-16 border border-zinc-800 rounded-xl p-6 bg-zinc-900/30">
          <h3 className="text-white font-semibold text-lg mb-4">Quick start (cURL)</h3>
          <Code>{`# 1. Find leads
curl -X POST https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"area":"pizza restaurants New York","limit":5}'

# 2. Enrich with full intelligence (use lead id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/leads/intelligence \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>"}'

# 3. Generate a message (use lead id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/messages/generate \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>","template":"cold_outreach","tone":"friendly"}'

# 4. Send it (use message id from step 3)
curl -X POST https://your-app.vercel.app/api/v1/messages/send \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message_id":"<id>"}'`}</Code>
        </div>
      </div>
    </section>
  )
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  key: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  sparkle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.3-6.7-2.1 2.1M9.4 14.6l-2.1 2.1m0-11.4 2.1 2.1m5.2 5.2 2.1 2.1"/>
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
    </svg>
  ),
}

function Features() {
  const items = [
    {
      icon: 'key',
      title: 'API key auth',
      desc: 'Every request validated via x-api-key header. Keys are hashed at rest — never stored plain.',
    },
    {
      icon: 'chart',
      title: 'Usage tracking',
      desc: 'Every request is logged with endpoint and timestamp. Query your full history any time.',
    },
    {
      icon: 'shield',
      title: 'Rate limiting',
      desc: 'Configurable per-key request limits. Automatic 429 responses when exceeded.',
    },
    {
      icon: 'sparkle',
      title: 'OSINT enrichment',
      desc: 'theHarvester-powered discovery of emails, employees, subdomains, and tech stack for any domain.',
    },
    {
      icon: 'layers',
      title: 'Multi-platform DMs',
      desc: 'Instagram, Twitter/X, and LinkedIn DM automation via Playwright browser automation.',
    },
    {
      icon: 'database',
      title: 'MCP server',
      desc: 'All 8 tools exposed as a remote MCP server. Connect Claude, Cursor, or any MCP-compatible agent in seconds.',
    },
  ]

  return (
    <section id="features" className="py-20 px-6 border-t border-zinc-800">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-white text-center mb-16">What you get</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div
              key={item.title}
              className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/20 hover:border-zinc-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-violet-950/60 border border-violet-900/40 flex items-center justify-center text-violet-400 mb-4">
                {FEATURE_ICONS[item.icon]}
              </div>
              <h3 className="text-white font-semibold mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ForAgents() {
  const mcpConfig = `{
  "mcpServers": {
    "leadapi": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer sk_live_YOUR_KEY"
      }
    }
  }
}`

  return (
    <section id="for-agents" className="py-20 px-6 border-t border-zinc-800">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <span className="inline-block bg-violet-900/40 text-violet-300 text-xs font-medium px-3 py-1 rounded-full border border-violet-800 mb-4">
            Agent-native
          </span>
          <h2 className="text-3xl font-bold text-white mb-4">Built for AI Agents</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Integrate LeadAPI into your agent in minutes. Machine-readable docs, OpenAPI spec, and a remote MCP server ready to connect.
          </p>
        </div>

        {/* Resource cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              label: 'LLM Reference',
              href: '/llms.txt',
              desc: 'Plain text API reference optimised for LLM context windows.',
              tag: '/llms.txt',
            },
            {
              label: 'OpenAPI Spec',
              href: '/openapi.json',
              desc: 'OpenAPI 3.1 schema for typed integration and SDK generation.',
              tag: '/openapi.json',
            },
            {
              label: 'Interactive Docs',
              href: '/docs',
              desc: 'Full documentation with code examples in cURL, Node.js, and Python.',
              tag: '/docs',
            },
          ].map(r => (
            <a
              key={r.href}
              href={r.href}
              className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20 hover:border-violet-800/60 hover:bg-violet-950/20 transition-colors group"
            >
              <code className="text-xs text-violet-400 font-mono mb-3 block">{r.tag}</code>
              <div className="text-white font-semibold text-sm mb-1 group-hover:text-violet-300 transition-colors">{r.label}</div>
              <p className="text-zinc-500 text-xs leading-relaxed">{r.desc}</p>
            </a>
          ))}
        </div>

        {/* MCP snippet */}
        <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Connect via MCP</h3>
            <span className="text-xs text-zinc-500">Claude Desktop · Cursor · Windsurf</span>
          </div>
          <Code>{mcpConfig}</Code>
          <p className="text-zinc-500 text-xs mt-3">
            Or connect Claude.ai directly: Settings → Integrations → Add MCP Server →{' '}
            <code className="text-violet-400 font-mono">https://your-app.vercel.app/api/mcp</code>
          </p>
        </div>
      </div>
    </section>
  )
}

function GetStarted() {
  return (
    <section id="get-started" className="py-20 px-6 border-t border-zinc-800">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — CTA */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Start building in minutes
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Get an API key from the dashboard, add it to your request header,
              and you&apos;re finding leads and sending messages immediately — no scraping
              code, no browser automation, no setup.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Get your API key
              </a>
              <a
                href="/docs"
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                View docs →
              </a>
            </div>
          </div>

          {/* Right — simple steps */}
          <div className="space-y-3">
            {[
              {
                n: '1',
                t: 'Get an API key',
                s: 'Create one in the dashboard — takes 10 seconds.',
              },
              {
                n: '2',
                t: 'Add it to your header',
                s: 'x-api-key: sk_live_YOUR_KEY on every request.',
              },
              {
                n: '3',
                t: 'Make your first call',
                s: 'POST /api/v1/leads/find with a platform and niche.',
              },
            ].map(step => (
              <div
                key={step.n}
                className="flex items-start gap-4 border border-zinc-800 rounded-xl p-4 bg-zinc-900/20"
              >
                <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-violet-400 text-xs font-bold">{step.n}</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium mb-0.5">{step.t}</div>
                  <div className="text-zinc-500 text-xs">{step.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 px-6 text-center text-zinc-600 text-sm">
      <p>
        LeadAPI &mdash; Built with Next.js, Supabase, OpenAI &amp; Playwright
      </p>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Endpoints />
        <Features />
        <ForAgents />
        <GetStarted />
      </main>
      <Footer />
    </>
  )
}
