import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that have their own authentication (webhooks, external callbacks)
const PUBLIC_API_PREFIXES = [
  '/api/webhooks/',
  '/api/telegram/',
  '/api/health',
]

// Host aliases that front specific app paths
const WIKI_HOST = 'wiki.act.place'
const WIKI_PASSTHROUGH_PREFIXES = ['/wiki', '/knowledge', '/api', '/_next', '/icons', '/fonts', '/.well-known']
const WIKI_PASSTHROUGH_FILES = new Set(['/tractorpedia-manifest.json', '/manifest.json', '/favicon.ico', '/robots.txt', '/sitemap.xml'])

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function rewriteForWikiHost(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host') ?? ''
  const isWikiHost = host === WIKI_HOST || host.startsWith(`${WIKI_HOST}:`)
  if (!isWikiHost) return null

  const url = request.nextUrl
  if (url.pathname === '/' || url.pathname === '') {
    const rewritten = url.clone()
    rewritten.pathname = '/wiki'
    return NextResponse.rewrite(rewritten)
  }
  if (WIKI_PASSTHROUGH_PREFIXES.some(p => url.pathname.startsWith(p))) return null
  if (WIKI_PASSTHROUGH_FILES.has(url.pathname)) return null

  // Treat any other top-level path as a wiki slug: /picc → /wiki?page=picc
  const rewritten = url.clone()
  const slug = url.pathname.replace(/^\/+/, '')
  rewritten.pathname = '/wiki'
  if (slug) rewritten.searchParams.set('page', slug)
  return NextResponse.rewrite(rewritten)
}

export function middleware(request: NextRequest) {
  // Host-alias rewrite runs before auth so wiki.act.place landing works without a key
  const hostRewrite = rewriteForWikiHost(request)
  if (hostRewrite) return hostRewrite

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
  // Run on everything except static assets — needed so the wiki.act.place host
  // rewrite catches root requests. The /api auth gate still only fires on /api.
  matcher: [
    '/((?!_next/static|_next/image|icons/|fonts/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)',
    '/:dotSlug(\\.[^/]+)',
    '/concepts/.soul',
    '/api/:path*',
  ],
}
