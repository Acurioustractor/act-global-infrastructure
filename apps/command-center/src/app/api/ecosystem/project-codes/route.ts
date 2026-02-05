/**
 * Ecosystem Project Codes API
 *
 * GET /api/ecosystem/project-codes
 *
 * Returns active projects from config/project-codes.json with their codes,
 * names, primary GHL tags, and categories.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

interface ProjectCodeEntry {
  name: string
  code: string
  category: string
  status: string
  priority?: string
  ghl_tags?: string[]
}

export async function GET() {
  try {
    const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    const projects = Object.values(raw.projects as Record<string, ProjectCodeEntry>)
      .filter((p) => p.status === 'active' || p.status === 'ideation')
      .map((p) => ({
        code: p.code,
        name: p.name,
        category: p.category,
        ghlTag: p.ghl_tags?.[0] || p.code.toLowerCase(),
        status: p.status,
        priority: p.priority || 'medium',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ projects })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
