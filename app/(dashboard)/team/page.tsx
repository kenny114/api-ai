'use client'

import { useEffect, useState } from 'react'

type Member = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export default function TeamPage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [name, setName]         = useState('')
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<{ name: string; secret: string } | null>(null)

  async function load() {
    const res  = await fetch('/api/dashboard/team')
    const data = await res.json()
    setMembers(data.members ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/dashboard/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewSecret({ name: data.name, secret: data.secret })
      setName('')
      load()
    }
    setCreating(false)
  }

  async function revoke(id: string, memberName: string) {
    if (!confirm(`Revoke access for ${memberName}? They will not be able to log in.`)) return
    await fetch('/api/dashboard/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Access</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Create named access secrets for people you want to give dashboard access to.
        </p>
      </div>

      {/* Owner note */}
      <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/20 mb-6 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Your owner login uses the <code className="text-violet-400 font-mono text-xs">ADMIN_SECRET</code> env var and is not listed here.
          Secrets created below are for additional people — revoke them individually at any time.
        </p>
      </div>

      {/* Create form */}
      <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30 mb-6">
        <h2 className="text-sm font-medium text-white mb-4">Invite someone</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-1.5">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="e.g. Alex — Sales partner"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {creating ? 'Creating…' : 'Create access'}
          </button>
        </div>
      </div>

      {/* New secret reveal */}
      {newSecret && (
        <div className="border border-violet-700/50 rounded-xl p-5 bg-violet-950/20 mb-6">
          <p className="text-violet-300 text-sm font-medium mb-1">
            Access secret for <span className="text-white">{newSecret.name}</span> — share this once. It won&apos;t be shown again.
          </p>
          <p className="text-zinc-500 text-xs mb-3">They paste this into the login field at <code className="text-zinc-400">/login</code>.</p>
          <code className="font-mono text-sm text-white break-all">{newSecret.secret}</code>
          <button
            onClick={() => setNewSecret(null)}
            className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 block transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Members table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-600 text-sm">Loading…</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  No team members yet — invite someone above.
                </td>
              </tr>
            ) : (
              members.map(m => (
                <tr key={m.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3 text-white">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.is_active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      {m.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.is_active && (
                      <button
                        onClick={() => revoke(m.id, m.name)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
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
