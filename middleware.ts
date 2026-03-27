import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Headers used for every Supabase REST call from the Edge. */
const sbHeaders = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Dashboard page auth ─────────────────────────────────────────────────
  // Protect /dashboard, /api-keys, /usage — redirect to /login if no session
  if (
    pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
    pathname === '/api-keys'  || pathname.startsWith('/api-keys/')  ||
    pathname === '/usage'     || pathname.startsWith('/usage/')     ||
    pathname === '/team'      || pathname.startsWith('/team/')
  ) {
    if (!request.cookies.get('dash_session')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // ── Dashboard API auth ──────────────────────────────────────────────────
  // Protect /api/dashboard/* — 401 if no session cookie
  if (pathname.startsWith('/api/dashboard/')) {
    if (!request.cookies.get('dash_session')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── API v1: key management uses ADMIN_SECRET — skip API key check ───────
  if (pathname === '/api/v1/keys') return NextResponse.next()

  // ── API v1: require x-api-key header ────────────────────────────────────
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing x-api-key header', code: 'MISSING_API_KEY' },
      { status: 401 }
    )
  }

  // Look up the key in api_keys
  let keyRecord: { id: string; requests_used: number; requests_limit: number } | null = null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/api_keys` +
        `?key=eq.${encodeURIComponent(apiKey)}` +
        `&select=id,requests_used,requests_limit` +
        `&limit=1`,
      { headers: sbHeaders, cache: 'no-store' }
    )

    if (!res.ok) {
      console.error('Supabase key lookup failed:', res.status, await res.text())
      return NextResponse.json(
        { error: 'Auth service unavailable', code: 'AUTH_ERROR' },
        { status: 503 }
      )
    }

    const rows = await res.json()
    keyRecord = rows[0] ?? null
  } catch (err) {
    console.error('Middleware fetch error:', err)
    return NextResponse.json(
      { error: 'Auth service unavailable', code: 'AUTH_ERROR' },
      { status: 503 }
    )
  }

  if (!keyRecord) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'INVALID_API_KEY' },
      { status: 401 }
    )
  }

  if (keyRecord.requests_used >= keyRecord.requests_limit) {
    return NextResponse.json(
      {
        error: 'Request limit exceeded. Upgrade your plan to continue.',
        code: 'LIMIT_EXCEEDED',
        used: keyRecord.requests_used,
        limit: keyRecord.requests_limit,
      },
      { status: 429 }
    )
  }

  const newUsed = keyRecord.requests_used + 1

  Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/api_keys?id=eq.${keyRecord.id}`,
      {
        method: 'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ requests_used: newUsed }),
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/usage_logs`,
      {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          api_key_id: keyRecord.id,
          endpoint: pathname,
        }),
      }
    ),
  ]).catch(err => console.error('Usage tracking error:', err))

  const forwarded = new Headers(request.headers)
  forwarded.set('x-api-key-id',    keyRecord.id)
  forwarded.set('x-api-key-used',  String(newUsed))
  forwarded.set('x-api-key-limit', String(keyRecord.requests_limit))

  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = {
  matcher: [
    '/api/v1/:path*',
    '/api/dashboard/:path*',
    '/dashboard/:path*',
    '/api-keys/:path*',
    '/usage/:path*',
    '/team/:path*',
  ],
}
