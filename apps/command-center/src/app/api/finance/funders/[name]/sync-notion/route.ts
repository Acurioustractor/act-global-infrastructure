import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

const REPO_ROOT = path.resolve(process.cwd(), '../..')  // apps/command-center → repo root

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const funderName = decodeURIComponent(name)
    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    // Use a distinctive token from the funder name (avoid spaces in --funder arg)
    const token = funderName.split(/\s+/).find((w: string) => w.length >= 4) || funderName

    const cmd = [
      'node',
      `${REPO_ROOT}/scripts/sync-funder-reporting-to-notion.mjs`,
      '--apply',
      `--funder "${token.replace(/"/g, '\\"')}"`,
      force ? '--force-update' : '',
    ].filter(Boolean).join(' ')

    // NEXT_PUBLIC_SUPABASE_URL is the authoritative SHARED instance URL in
    // command-center env (the legacy SUPABASE_SHARED_URL var points to EL v2
    // in apps/command-center/.env.local, which is misleading). Pass the real
    // shared URL explicitly to override.
    const childEnv = {
      ...process.env,
      SUPABASE_SHARED_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
      SUPABASE_SHARED_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      NOTION_TOKEN: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '',
    } as NodeJS.ProcessEnv

    // cwd = /tmp so no .env.local is loaded by the script's load-env helper
    // (whichever .env.local would be loaded, it may have a stale or
    // wrong-project SUPABASE_SHARED_URL that overrides our explicit value).
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: '/tmp',
      timeout: 60000,
      env: childEnv,
    })

    // Parse the URL out of the script output (it logs "created: <url>" or "updated: <url>")
    const urlMatch = stdout.match(/(?:created|skipped-existing|appended):\s+(https:\/\/\S+)/)
    const action = stdout.includes('created:') ? 'created'
      : stdout.includes('appended:') ? 'refreshed'
      : stdout.includes('skipped-existing:') ? 'already-exists'
      : 'unknown'

    return NextResponse.json({
      ok: true,
      action,
      url: urlMatch?.[1] || null,
      stdout: stdout.split('\n').slice(-15).join('\n'),
      stderr: stderr || null,
    })
  } catch (error: any) {
    console.error('POST sync-notion error:', error.message)
    return NextResponse.json({
      ok: false,
      error: error.message,
      stdout: error.stdout?.split('\n').slice(-10).join('\n'),
      stderr: error.stderr,
    }, { status: 500 })
  }
}
