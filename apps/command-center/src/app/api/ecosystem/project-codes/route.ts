/**
 * Ecosystem Project Codes API
 *
 * GET /api/ecosystem/project-codes
 *
 * Returns active projects from config/project-codes.json with their codes,
 * names, primary GHL tags, and categories.
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: projectRows, error } = await supabase
      .from('projects')
      .select('code, name, category, status, priority, ghl_tags')
      .in('status', ['active', 'ideation'])
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const projects = (projectRows || []).map((p) => ({
      code: p.code,
      name: p.name,
      category: p.category,
      ghlTag: p.ghl_tags?.[0] || p.code.toLowerCase(),
      status: p.status,
      priority: p.priority || 'medium',
    }))

    return NextResponse.json({ projects })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
