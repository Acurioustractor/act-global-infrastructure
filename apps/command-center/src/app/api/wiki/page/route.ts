import { NextResponse, type NextRequest } from 'next/server'
import { renderWikiMarkdown, resolveWikiPath } from '@/lib/wiki-files'

export async function GET(request: NextRequest) {
  try {
    const path = new URL(request.url).searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    const page = resolveWikiPath(path)
    if (!page) {
      return NextResponse.json({
        path,
        title: path,
        frontmatter: {},
        content: `# ${path}\n\nThis wiki page hasn't been created yet in the canonical wiki or the command-center snapshot.`,
      })
    }

    return NextResponse.json({
      path: page.path,
      title: page.title,
      frontmatter: page.frontmatter,
      content: renderWikiMarkdown(page.content),
    })
  } catch (e) {
    console.error('Wiki page error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
