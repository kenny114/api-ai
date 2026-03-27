import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type UsageLog = {
  id: string
  endpoint: string
  created_at: string
  api_keys: { name: string | null } | null
}

export default async function UsagePage() {
  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('usage_logs')
    .select('id, endpoint, created_at, api_keys(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (logs ?? []) as unknown as UsageLog[]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Usage</h1>
        <p className="text-zinc-500 text-sm mt-1">Last 100 API requests across all keys</p>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Endpoint</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Key</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  No usage logs yet
                </td>
              </tr>
            ) : (
              rows.map(log => (
                <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-violet-400">{log.endpoint}</code>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {log.api_keys?.name ?? <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
