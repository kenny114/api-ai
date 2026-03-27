import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const [keysResult, leadsResult, sentResult] = await Promise.all([
    supabase.from('api_keys').select('requests_used'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
  ])

  const apiKeys       = keysResult.data ?? []
  const totalRequests = apiKeys.reduce((sum, k) => sum + (k.requests_used ?? 0), 0)

  const stats = [
    { label: 'API Keys',       value: apiKeys.length         },
    { label: 'Requests Used',  value: totalRequests          },
    { label: 'Leads Found',    value: leadsResult.count ?? 0 },
    { label: 'Messages Sent',  value: sentResult.count ?? 0  },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Overview of your LeadAPI usage</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">
              {s.label}
            </div>
            <div className="text-white text-3xl font-bold tabular-nums">
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/20">
        <h2 className="text-white font-semibold mb-4">Quick start</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Authenticate every request with your API key in the{' '}
          <code className="text-violet-400 font-mono text-xs bg-violet-950/30 px-1.5 py-0.5 rounded">
            x-api-key
          </code>{' '}
          header.
        </p>
        <pre className="code-block">{`curl -X POST https://your-app.vercel.app/api/v1/leads/find \\
  -H "x-api-key: sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"platform":"instagram","niche":"fitness coaches","limit":5}'`}</pre>
      </div>
    </div>
  )
}
