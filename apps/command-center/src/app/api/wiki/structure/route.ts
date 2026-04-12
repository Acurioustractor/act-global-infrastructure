import { NextResponse } from 'next/server'
import { getCanonicalWikiSections } from '@/lib/wiki-files'

export async function GET() {
  try {
    return NextResponse.json({ sections: getCanonicalWikiSections() })
  } catch (e) {
    console.error('Wiki structure error:', e)
    return NextResponse.json({ sections: [] })
  }
}
