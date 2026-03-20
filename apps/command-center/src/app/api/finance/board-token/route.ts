import { NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  return process.env.API_SECRET_KEY || 'dev-board-token-secret'
}

function generateToken(): { token: string; expires: number } {
  const expires = Date.now() + TOKEN_TTL_MS
  const payload = `board:${expires}:${randomBytes(8).toString('hex')}`
  const signature = createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 16)
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url')
  return { token, expires }
}

export function verifyBoardToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 4 || parts[0] !== 'board') return false

    const expires = parseInt(parts[1])
    if (Date.now() > expires) return false

    const payload = parts.slice(0, 3).join(':')
    const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 16)
    return parts[3] === expectedSig
  } catch {
    return false
  }
}

export async function POST() {
  const { token, expires } = generateToken()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3001'

  const url = `${baseUrl}/finance/board?token=${token}`

  return NextResponse.json({
    url,
    token,
    expires: new Date(expires).toISOString(),
    expiresIn: '7 days',
  })
}
