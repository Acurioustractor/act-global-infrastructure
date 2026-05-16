import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)
const MAX_PDF_BYTES = 25 * 1024 * 1024

async function findPdfToPpm() {
  const candidates = [
    '/opt/homebrew/bin/pdftoppm',
    '/usr/local/bin/pdftoppm',
    'pdftoppm',
  ]

  for (const candidate of candidates) {
    try {
      if (candidate.includes('/')) await access(candidate)
      return candidate
    } catch {
      // Try the next known install path.
    }
  }

  return null
}

function parsePreviewUrl(rawUrl: string | null) {
  if (!rawUrl) throw new Error('url required')
  const url = new URL(rawUrl)

  // This endpoint fetches server-side; keep it scoped to Supabase storage URLs.
  if (!url.hostname.endsWith('.supabase.co')) {
    throw new Error('unsupported pdf host')
  }

  return url
}

export async function GET(request: NextRequest) {
  const workDir = join(tmpdir(), `receipt-pdf-preview-${randomUUID()}`)

  try {
    const pdfUrl = parsePreviewUrl(request.nextUrl.searchParams.get('url'))
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || '1') || 1)
    const dpi = Math.min(240, Math.max(120, Number(request.nextUrl.searchParams.get('dpi') || '180') || 180))
    const pdftoppm = await findPdfToPpm()

    if (!pdftoppm) {
      return NextResponse.json({ error: 'pdftoppm not installed' }, { status: 500 })
    }

    const pdfRes = await fetch(pdfUrl.toString(), { cache: 'no-store' })
    if (!pdfRes.ok) {
      return NextResponse.json({ error: `failed to fetch pdf: ${pdfRes.status}` }, { status: 502 })
    }

    const contentType = pdfRes.headers.get('content-type') || ''
    if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      return NextResponse.json({ error: `unsupported content type: ${contentType}` }, { status: 415 })
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
    if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'pdf too large to preview' }, { status: 413 })
    }

    await mkdir(workDir, { recursive: true })
    const pdfPath = join(workDir, 'source.pdf')
    const outputBase = join(workDir, 'page')
    const outputPath = `${outputBase}.png`

    await writeFile(pdfPath, pdfBuffer)
    await execFileAsync(pdftoppm, [
      '-png',
      '-singlefile',
      '-f',
      String(page),
      '-l',
      String(page),
      '-r',
      String(dpi),
      pdfPath,
      outputBase,
    ], { timeout: 20_000 })

    const image = await readFile(outputPath)
    return new NextResponse(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
