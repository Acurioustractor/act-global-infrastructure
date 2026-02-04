import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const WIKI_DIR = join(process.cwd(), 'public', 'wiki')

interface WikiPage {
  name: string
  path: string
  title: string
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1] : content
}

async function getWikiPages(dir: string): Promise<WikiPage[]> {
  const pages: WikiPage[] = []

  try {
    const files = await readdir(dir)
    for (const file of files) {
      if (file.endsWith('.md')) {
        const raw = await readFile(join(dir, file), 'utf-8')
        // Strip frontmatter before looking for title heading
        const content = stripFrontmatter(raw)
        const titleMatch = content.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '')
        const name = file === 'index.md' ? title : file.replace('.md', '')
        const path = file === 'index.md' ? '' : file.replace('.md', '')
        pages.push({ name, path, title })
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return pages
}

async function getSubfolderPages(parentDir: string, subfolder: string, pathPrefix: string): Promise<WikiPage[]> {
  const dir = join(parentDir, subfolder)
  if (!existsSync(dir)) return []
  const pages = await getWikiPages(dir)
  return pages.map(p => ({
    ...p,
    path: p.path ? `${pathPrefix}/${subfolder}/${p.path}` : `${pathPrefix}/${subfolder}`,
  }))
}

export async function GET() {
  try {
    const sections = []

    // ACT Philosophy section — main page + sub-pages
    if (existsSync(join(WIKI_DIR, 'act'))) {
      const actPages = await getWikiPages(join(WIKI_DIR, 'act'))
      const mappedPages = actPages.map(p => ({
        ...p,
        path: p.path ? `act/${p.path}` : 'act',
      }))

      // Add identity sub-pages
      const identityPages = await getSubfolderPages(join(WIKI_DIR, 'act'), 'identity', 'act')
      mappedPages.push(...identityPages)

      // Add appendices sub-pages
      const appendixPages = await getSubfolderPages(join(WIKI_DIR, 'act'), 'appendices', 'act')
      mappedPages.push(...appendixPages)

      if (mappedPages.length > 0) {
        sections.push({
          id: 'act',
          title: 'ACT',
          pages: mappedPages,
        })
      }
    }

    // Place section
    if (existsSync(join(WIKI_DIR, 'place'))) {
      const placePages = await getWikiPages(join(WIKI_DIR, 'place'))
      if (placePages.length > 0) {
        sections.push({
          id: 'place',
          title: 'Place',
          pages: placePages.map(p => ({
            ...p,
            path: p.path ? `place/${p.path}` : 'place',
          })),
        })
      }
    }

    // Stories section
    if (existsSync(join(WIKI_DIR, 'stories'))) {
      const storyPages = await getWikiPages(join(WIKI_DIR, 'stories'))
      if (storyPages.length > 0) {
        // Put index first, then sort rest alphabetically
        const indexPage = storyPages.find(p => p.path === '')
        const otherPages = storyPages
          .filter(p => p.path !== '' && p.path !== 'vignette-template')
          .sort((a, b) => a.title.localeCompare(b.title))

        const orderedPages = [
          ...(indexPage ? [indexPage] : []),
          ...otherPages,
        ].map(p => ({
          ...p,
          path: p.path ? `stories/${p.path}` : 'stories',
        }))

        sections.push({
          id: 'stories',
          title: 'Stories',
          pages: orderedPages,
        })
      }
    }

    // Projects section
    const projectFolders = ['empathy-ledger', 'justicehub', 'goods', 'the-harvest', 'the-farm', 'the-studio']
    const projectPages: WikiPage[] = []

    for (const folder of projectFolders) {
      const folderPath = join(WIKI_DIR, folder)
      if (existsSync(folderPath)) {
        const pages = await getWikiPages(folderPath)
        const indexPage = pages.find(p => p.path === '')
        if (indexPage) {
          projectPages.push({ ...indexPage, path: folder })
        }
      }
    }

    if (projectPages.length > 0) {
      sections.push({
        id: 'projects',
        title: 'Projects',
        pages: projectPages,
      })
    }

    // If no files found, return fallback structure
    if (sections.length === 0) {
      return NextResponse.json({
        sections: [
          {
            id: 'act',
            title: 'ACT',
            pages: [
              { name: 'A Curious Tractor', path: 'act', title: 'A Curious Tractor' },
            ],
          },
          {
            id: 'projects',
            title: 'Projects',
            pages: [
              { name: 'Empathy Ledger', path: 'empathy-ledger', title: 'Empathy Ledger' },
              { name: 'JusticeHub', path: 'justicehub', title: 'JusticeHub' },
              { name: 'Goods', path: 'goods', title: 'Goods' },
              { name: 'The Harvest', path: 'the-harvest', title: 'The Harvest' },
              { name: 'The Farm', path: 'the-farm', title: 'The Farm' },
              { name: 'The Studio', path: 'the-studio', title: 'The Studio' },
            ],
          },
        ],
      })
    }

    return NextResponse.json({ sections })
  } catch (e) {
    console.error('Wiki structure error:', e)
    return NextResponse.json({ sections: [] })
  }
}
