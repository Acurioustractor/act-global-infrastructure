import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Catch-all for The Field's generated artefacts, so RELATIVE links inside the
 * served surfaces just work (found 2026-06-07: "page" links in the morning read
 * 404'd — person pages were never browser-reachable):
 *   /api/field/people/<slug>.md      → person page, rendered readable
 *   /api/field/orbit-viz.html        → surface (same files as ?name=)
 *   /api/field/project-scope-board.html
 *   /api/field/the-field-morning.html
 */
const REPO = path.resolve(process.cwd(), '..', '..')
const SURFACE_FILES = new Set(['orbit-viz.html', 'project-scope-board.html', 'the-field-morning.html', 'the-whole-picture.html', 'monday-card.html'])

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** tiny md → html: headings, bold, links, bullets — enough to read a person page */
function mdToHtml(md: string): string {
  const body = esc(md)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/_\(([^)]+)\)_/g, '<i>($1)</i>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '<br><br>')
  return `<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>
    body{background:#0b0e14;color:#e6edf3;font:15px/1.6 -apple-system,sans-serif;max-width:760px;margin:0 auto;padding:32px 20px}
    h1{font-size:26px;margin:4px 0}h2{font-size:15px;color:#8b98a9;text-transform:uppercase;letter-spacing:.5px;margin:26px 0 8px;border-bottom:1px solid #1f2937;padding-bottom:5px}
    a{color:#5fb3ff}li{margin:3px 0}blockquote{border-left:3px solid #ffd24a;margin:6px 0;padding:2px 12px;color:#ffe9a8}
    hr{border:0;border-top:1px solid #1f2937;margin:20px 0}b{color:#fff}i{color:#8b98a9}
  </style></head><body>${body}</body></html>`
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path || []
  const last = parts[parts.length - 1] || ''

  if (parts[0] === 'people' && parts.length === 2 && /^[a-z0-9-]+\.md$/.test(last)) {
    try {
      const md = await fs.readFile(path.join(REPO, 'thoughts/shared/people', last), 'utf8')
      return new NextResponse(mdToHtml(md), { headers: { 'content-type': 'text/html; charset=utf-8' } })
    } catch { return new NextResponse('no page yet for this person', { status: 404 }) }
  }
  if (parts.length === 1 && SURFACE_FILES.has(last)) {
    try {
      const html = await fs.readFile(path.join(REPO, 'thoughts/shared', last), 'utf8')
      return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    } catch { return new NextResponse('surface not built yet', { status: 404 }) }
  }
  return NextResponse.json({ error: 'not found' }, { status: 404 })
}
