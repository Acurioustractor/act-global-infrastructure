import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Placeholder — actual health check would ping the site
  return NextResponse.json({ success: true, check: { slug, status: 'healthy', checked_at: new Date().toISOString() } })
}
