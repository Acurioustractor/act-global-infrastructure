import { NextResponse } from 'next/server'
import { getEofyTrackerData } from '@/lib/eofy/notion-tracker'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const data = await getEofyTrackerData()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
