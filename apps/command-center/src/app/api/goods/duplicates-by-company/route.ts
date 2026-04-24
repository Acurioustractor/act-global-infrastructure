import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: contacts, error } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, tags, company_name, created_at')
      .contains('tags', ['goods'])
      .not('company_name', 'is', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const groups = new Map<string, typeof contacts>()
    for (const c of contacts || []) {
      const key = c.company_name!.trim().toLowerCase()
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(c)
    }

    const duplicates = Array.from(groups.entries())
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({
        email: key,
        contacts: group.map(c => ({
          ghl_id: c.ghl_id,
          full_name: c.full_name,
          tags: c.tags || [],
          company_name: c.company_name,
          created_at: c.created_at,
        })),
      }))

    return NextResponse.json({ duplicates, count: duplicates.length })
  } catch (e) {
    console.error('Duplicates-by-company error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
