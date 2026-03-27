import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let body: { secret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || body.secret !== adminSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('dash_session', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
