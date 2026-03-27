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
      title: 'Find Leads',
      desc: 'Provide a platform and niche. We scrape matching profiles and return structured data — username, bio, follower count, and more.',
      endpoint: 'POST /api/v1/leads/find',
    },
    {
      step: '02',
      title: 'Generate Message',
      desc: 'Pass a lead ID. Our LLM writes a personalised outreach message tailored to their bio, platform, and your chosen tone.',
      endpoint: 'POST /api/v1/messages/generate',
    },
    {
      step: '03',
      title: 'Send It',
      desc: 'Pass a message ID. We automate the DM delivery on the target platform. Schedule for later or send immediately.',
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
            description="Scrape and return matching lead profiles from a given platform and niche."
            request={`{
  "platform": "instagram",
  "niche": "fitness coaches",
  "limit": 10,
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

          <EndpointCard
            method="POST"
            path="/api/v1/messages/generate"
            description="Generate a personalised outreach message for a lead using AI."
            request={`{
  "lead_id": "a1b2c3d4-...",
  "campaign_type": "promotion",
  "tone": "friendly"
}`}
            response={`{
  "message_id": "e5f6g7h8-...",
  "message_text": "Hey John! Loved your recent content —
we're running a limited promo for coaches
and think you'd be a great fit.
Mind if I share details?",
  "status": "draft"
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/messages/send"
            description="Send an approved message via platform automation. Optionally schedule for later."
            request={`{
  "message_id": "e5f6g7h8-...",
  "scheduled_at": null
}`}
            response={`{
  "log_id": "i9j0k1l2-...",
  "status": "sent",
  "sent_at": "2024-03-15T14:23:01Z",
  "platform": "instagram",
  "username": "johnfitness"
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
  -d '{"platform":"instagram","niche":"fitness coaches","limit":5}'

# 2. Generate a message (use lead id from step 1)
curl -X POST https://your-app.vercel.app/api/v1/messages/generate \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lead_id":"<id>","campaign_type":"promotion","tone":"friendly"}'

# 3. Send it (use message id from step 2)
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
      title: 'AI generation',
      desc: 'GPT-4o-mini by default. Swap to any OpenAI model via env var.',
    },
    {
      icon: 'layers',
      title: 'Multi-platform',
      desc: 'Instagram, Twitter/X, LinkedIn, and Google Maps supported out of the box.',
    },
    {
      icon: 'database',
      title: 'Postgres backend',
      desc: 'All leads, messages, and logs stored in Supabase. Full history, no black boxes.',
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
        LeadAPI &mdash; Built with Next.js, Supabase, OpenAI &amp; Puppeteer
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
        <GetStarted />
      </main>
      <Footer />
    </>
  )
}
