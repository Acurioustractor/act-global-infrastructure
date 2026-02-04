import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const WIKI_DIR = join(process.cwd(), 'public', 'wiki')

export async function GET(request: NextRequest) {
  try {
    const path = new URL(request.url).searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    // Try to find the markdown file
    // Path could be: "justicehub", "act", "justicehub/philosophy", etc.
    let filePath = join(WIKI_DIR, path, 'index.md')

    if (!existsSync(filePath)) {
      // Try as a direct file
      filePath = join(WIKI_DIR, `${path}.md`)
    }

    if (!existsSync(filePath)) {
      // Try path with .md extension inside folder
      const parts = path.split('/')
      if (parts.length === 1) {
        filePath = join(WIKI_DIR, parts[0], 'index.md')
      } else {
        filePath = join(WIKI_DIR, parts[0], `${parts.slice(1).join('/')}.md`)
      }
    }

    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8')

      // Extract title from first # heading
      const titleMatch = content.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : path

      // Extract frontmatter if present (---\n...\n---)
      let frontmatter = {}
      let bodyContent = content
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      if (fmMatch) {
        // Simple YAML-like parsing
        const fmLines = fmMatch[1].split('\n')
        for (const line of fmLines) {
          const [key, ...valueParts] = line.split(':')
          if (key && valueParts.length > 0) {
            frontmatter = { ...frontmatter, [key.trim()]: valueParts.join(':').trim() }
          }
        }
        bodyContent = fmMatch[2]
      }

      return NextResponse.json({
        path,
        title,
        frontmatter,
        content: bodyContent,
      })
    }

    return NextResponse.json({
      path,
      title: path,
      frontmatter: {},
      content: `# ${path}\n\nThis wiki page hasn't been created yet.\n\nCreate it at: \`public/wiki/${path}/index.md\``
    })
  } catch (e) {
    console.error('Wiki page error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
