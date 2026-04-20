import { NextResponse } from 'next/server'
import { getCanonicalWikiStatus } from '@/lib/wiki-files'

export async function GET() {
  try {
    const status = getCanonicalWikiStatus()
    if (!status) {
      return NextResponse.json(
        { error: 'Wiki status not generated yet' },
        { status: 404 },
      )
    }

    return NextResponse.json(status)
  } catch (e) {
    console.error('Wiki status error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
