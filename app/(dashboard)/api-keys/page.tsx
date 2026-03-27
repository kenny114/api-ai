'use client'

import { useEffect, useState } from 'react'

type ApiKey = {
  id: string
  name: string | null
  key_display: string
  requests_used: number
  requests_limit: number
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys]       = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newKey, setNewKey]   = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm]       = useState({ name: '', requests_limit: '1000' })
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetch('/api/dashboard/keys')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg = body.error ?? `Server error (${res.status})`
      console.error('[api-keys] load failed:', msg)
      setLoadError(msg)
      setLoading(false)
      return   // do NOT clear existing keys — keep whatever was there
    }
    const data = await res.json()
    setKeys(data.keys ?? [])
    setLoadError(null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    setCreating(true)
    setCreateError(null)
    const res = await fetch('/api/dashboard/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name || undefined,
        requests_limit: parseInt(form.requests_limit) || 1000,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewKey(data.key)
      setForm({ name: '', requests_limit: '1000' })
      await load()
    } else {
      setCreateError(data.error ?? 'Failed to create key')
    }
    setCreating(false)
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Any integrations using it will stop working immediately.')) return
    const res = await fetch('/api/dashboard/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) await load()
  }

  const pct = (used: number, limit: number) =>
    Math.min(100, limit > 0 ? Math.round((used / limit) * 100) : 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="text-zinc-500 text-sm mt-1">Create and manage access keys for your API</p>
      </div>

      {/* Create form */}
      <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30 mb-6">
        <h2 className="text-sm font-medium text-white mb-4">Create new key</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-zinc-400 block mb-1.5">Name <span className="text-zinc-600">(optional)</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Production"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="w-36">
            <label className="text-xs text-zinc-400 block mb-1.5">Request limit</label>
            <input
              type="number"
              min={1}
              value={form.requests_limit}
              onChange={e => setForm(f => ({ ...f, requests_limit: e.target.value }))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </div>
        {createError && (
          <p className="mt-3 text-xs text-red-400">{createError}</p>
        )}
      </div>

      {/* New key reveal */}
      {newKey && (
        <div className="border border-violet-700/50 rounded-xl p-5 bg-violet-950/20 mb-6">
          <p className="text-violet-300 text-sm font-medium mb-2">
            Copy your new key now — it won&apos;t be shown again.
          </p>
          <code className="font-mono text-sm text-white break-all">{newKey}</code>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 block transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div className="border border-red-900/40 rounded-xl p-4 bg-red-950/20 mb-6 flex items-start gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <p className="text-red-400 text-sm font-medium">Failed to load API keys</p>
            <p className="text-red-500/70 text-xs mt-0.5">{loadError}</p>
            <button onClick={load} className="text-xs text-zinc-500 hover:text-white mt-2 transition-colors">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Key</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Usage</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  Loading…
                </td>
              </tr>
            ) : !loadError && keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  No API keys yet — create one above.
                </td>
              </tr>
            ) : (
              keys.map(k => (
                <tr key={k.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3 text-white">
                    {k.name ?? <span className="text-zinc-600 italic">Unnamed</span>}
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-zinc-400">{k.key_display}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-24 bg-zinc-800 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${
                            pct(k.requests_used, k.requests_limit) >= 90
                              ? 'bg-red-500'
                              : 'bg-violet-600'
                          }`}
                          style={{ width: `${pct(k.requests_used, k.requests_limit)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 tabular-nums">
                        {k.requests_used.toLocaleString()} / {k.requests_limit.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => revoke(k.id)}
                      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      Revoke
                    </button>
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
