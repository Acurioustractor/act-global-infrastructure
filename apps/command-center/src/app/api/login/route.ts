import { NextResponse } from 'next/server'
import { DASH_COOKIE, dashTokenFor } from '@/lib/dash-auth'

// POST { password } → sets the auth cookie on success.
export async function POST(request: Request) {
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) {
    // No password configured = gate disabled (dev). Treat as already-in.
    return NextResponse.json({ ok: true, note: 'no password configured' })
  }
  let password = ''
  try {
    const body = await request.json()
    password = String(body?.password ?? '')
  } catch {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DASH_COOKIE, await dashTokenFor(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}

// DELETE → log out (clear the cookie).
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DASH_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
