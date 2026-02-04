import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const WIKI_DIR = join(process.cwd(), 'public', 'wiki')

interface SearchResult {
  path: string
  title: string
  snippet: string
  section: string
}

async function searchInFolder(folder: string, query: string, sectionName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const folderPath = join(WIKI_DIR, folder)

  if (!existsSync(folderPath)) return results

  try {
    const files = await readdir(folderPath)
    const queryLower = query.toLowerCase()

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const content = await readFile(join(folderPath, file), 'utf-8')
      const contentLower = content.toLowerCase()

      if (contentLower.includes(queryLower)) {
        // Extract title
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '')

        // Find snippet around the match
        const matchIndex = contentLower.indexOf(queryLower)
        const snippetStart = Math.max(0, matchIndex - 50)
        const snippetEnd = Math.min(content.length, matchIndex + query.length + 100)
        let snippet = content.substring(snippetStart, snippetEnd)
        if (snippetStart > 0) snippet = '...' + snippet
        if (snippetEnd < content.length) snippet = snippet + '...'

        const path = file === 'index.md' ? folder : `${folder}/${file.replace('.md', '')}`

        results.push({
          path,
          title,
          snippet: snippet.replace(/\n/g, ' ').trim(),
          section: sectionName,
        })
      }
    }
  } catch {
    // Folder doesn't exist or can't be read
  }

  return results
}

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get('q')
    if (!q || q.length < 2) return NextResponse.json({ results: [] })

    const allResults: SearchResult[] = []

    // Search ACT folder
    allResults.push(...await searchInFolder('act', q, 'ACT'))

    // Search project folders
    const projectFolders = [
      { folder: 'justicehub', name: 'JusticeHub' },
      { folder: 'empathy-ledger', name: 'Empathy Ledger' },
      { folder: 'goods', name: 'Goods' },
      { folder: 'the-harvest', name: 'The Harvest' },
      { folder: 'the-farm', name: 'The Farm' },
      { folder: 'the-studio', name: 'The Studio' },
    ]

    for (const { folder, name } of projectFolders) {
      allResults.push(...await searchInFolder(folder, q, name))
    }

    return NextResponse.json({ results: allResults.slice(0, 20) })
  } catch (e) {
    console.error('Wiki search error:', e)
    return NextResponse.json({ results: [] })
  }
}
