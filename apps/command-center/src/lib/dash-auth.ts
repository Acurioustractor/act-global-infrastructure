/**
 * Shared-password gate for the command-center.
 *
 * One password (env DASHBOARD_PASSWORD) gates all dashboard pages. On login we
 * store a hash of the password in an httpOnly cookie — never the raw password —
 * and the middleware compares it on every page request. Edge-safe (Web Crypto).
 */
export const DASH_COOKIE = 'dash_auth'

/** Opaque cookie token derived from the shared password (SHA-256, salted). */
export async function dashTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`act-dash:v1:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
