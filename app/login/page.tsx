'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [secret, setSecret] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid secret. Check your ADMIN_SECRET env var.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-semibold tracking-tight text-2xl">
            Lead<span className="text-violet-400">API</span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Dashboard access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Admin secret</label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              autoFocus
              required
              placeholder="Your ADMIN_SECRET value"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? 'Checking…' : 'Access dashboard'}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          <Link href="/" className="hover:text-zinc-400 transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
