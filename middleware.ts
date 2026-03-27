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

  // /api/v1/keys uses its own ADMIN_SECRET auth — skip API key check
  if (pathname === '/api/v1/keys') return NextResponse.next()

  // 1. Require the header
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing x-api-key header', code: 'MISSING_API_KEY' },
      { status: 401 }
    )
  }

  // 2. Look up the key in api_keys
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

  // 3. Reject invalid keys
  if (!keyRecord) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'INVALID_API_KEY' },
      { status: 401 }
    )
  }

  // 4. Reject over-limit keys
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

  // 5. Increment requests_used and write usage_log in parallel
  //    Both are fire-and-continue — a failure here is logged but never blocks the caller.
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

  // 6. Forward the validated key ID to route handlers via internal header
  const forwarded = new Headers(request.headers)
  forwarded.set('x-api-key-id',    keyRecord.id)
  forwarded.set('x-api-key-used',  String(newUsed))
  forwarded.set('x-api-key-limit', String(keyRecord.requests_limit))

  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = {
  matcher: '/api/v1/:path*',
}
