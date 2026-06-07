import { NextResponse, type NextRequest } from 'next/server'
import { hybridSearch } from '@/lib/wiki-search'
import { mergeWikiSearchResults, searchCanonicalWiki } from '@/lib/wiki-files'

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')
    if (!q || q.length < 2) return NextResponse.json({ results: [] })

    // Try hybrid search (BM25 + vector + RRF)
    try {
      const canonicalResults = searchCanonicalWiki(q)
      const results = await hybridSearch(q)
      if (results.length > 0) return NextResponse.json({ results: mergeWikiSearchResults(q, results, canonicalResults) })
    } catch (e) {
      console.warn('Hybrid search failed, falling back to substring:', e)
    }

    // Fallback: substring search
    return NextResponse.json({ results: searchCanonicalWiki(q) })
  } catch (e) {
    console.error('Wiki search error:', e)
    return NextResponse.json({ results: [] })
  }
}
