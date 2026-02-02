import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Try to get wiki pages from knowledge table
    const { data } = await supabase
      .from('project_knowledge')
      .select('id, title, project_code, type, metadata')
      .eq('type', 'wiki')
      .order('title', { ascending: true })

    if (data && data.length > 0) {
      // Group by project_code as sections
      const sectionMap = new Map<string, Array<{ name: string; path: string; title: string }>>()
      for (const page of data) {
        const section = page.project_code || 'General'
        if (!sectionMap.has(section)) sectionMap.set(section, [])
        sectionMap.get(section)!.push({
          name: page.title,
          path: page.id,
          title: page.title,
        })
      }

      const sections = Array.from(sectionMap.entries()).map(([title, pages], i) => ({
        id: String(i),
        title,
        pages,
      }))

      return NextResponse.json({ sections })
    }

    // Fallback: return default wiki sections based on known projects
    const sections = [
      {
        id: '0',
        title: 'ACT',
        pages: [
          { name: 'Mission', path: 'mission', title: 'Mission & Vision' },
          { name: 'LCAA', path: 'lcaa', title: 'LCAA Framework' },
          { name: 'ALMA', path: 'alma', title: 'ALMA Measurement' },
          { name: 'Philosophy', path: 'philosophy', title: 'ACT Philosophy' },
        ],
      },
      {
        id: '1',
        title: 'Projects',
        pages: [
          { name: 'Empathy Ledger', path: 'empathy-ledger', title: 'Empathy Ledger' },
          { name: 'JusticeHub', path: 'justicehub', title: 'JusticeHub' },
          { name: 'Goods', path: 'goods', title: 'Goods Marketplace' },
          { name: 'The Farm', path: 'the-farm', title: 'The Farm' },
          { name: 'The Harvest', path: 'the-harvest', title: 'The Harvest' },
          { name: 'The Studio', path: 'the-studio', title: 'Innovation Studio' },
        ],
      },
      {
        id: '2',
        title: 'Operations',
        pages: [
          { name: 'Tech Stack', path: 'tech-stack', title: 'Technology Stack' },
          { name: 'Architecture', path: 'architecture', title: 'System Architecture' },
          { name: 'Integrations', path: 'integrations', title: 'Integrations' },
        ],
      },
    ]

    return NextResponse.json({ sections })
  } catch (e) {
    console.error('Wiki structure error:', e)
    return NextResponse.json({ sections: [] })
  }
}
