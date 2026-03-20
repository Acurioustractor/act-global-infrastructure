import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that have their own authentication (webhooks, external callbacks)
const PUBLIC_API_PREFIXES = [
  '/api/webhooks/',
  '/api/telegram/',
  '/api/health',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only gate /api routes — pages are public (no user auth system yet)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Webhook and health routes use their own auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const apiKey = process.env.API_SECRET_KEY
  // If no key is configured, allow all requests (development mode)
  if (!apiKey) {
    return NextResponse.next()
  }

  // Check Authorization header or x-api-key header
  const authHeader = request.headers.get('authorization')
  const apiKeyHeader = request.headers.get('x-api-key')

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader

  if (token === apiKey) {
    return NextResponse.next()
  }

  // Check for same-origin requests (browser navigating the app)
  const referer = request.headers.get('referer')
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (host && (referer?.includes(host) || origin?.includes(host))) {
    return NextResponse.next()
  }

  return NextResponse.json(
    { error: 'Unauthorized — provide API key via Authorization: Bearer <key> or x-api-key header' },
    { status: 401 }
  )
}

export const config = {
  matcher: '/api/:path*',
}
