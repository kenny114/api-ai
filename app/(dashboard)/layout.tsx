'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/api-keys',  label: 'API Keys'  },
  { href: '/docs',      label: 'Docs'      },
  { href: '/usage',     label: 'Usage'     },
  { href: '/team',      label: 'Team'      },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="px-5 py-5 border-b border-zinc-800">
          <Link href="/" className="text-white font-semibold tracking-tight">
            Lead<span className="text-violet-400">API</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-600/15 text-violet-300'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-zinc-800">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/60 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  )
}
