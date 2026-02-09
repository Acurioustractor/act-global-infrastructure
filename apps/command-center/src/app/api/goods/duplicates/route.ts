import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all goods contacts with email
    const { data: contacts, error } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, tags, company_name, created_at')
      .contains('tags', ['goods'])
      .not('email', 'is', null)
      .order('email')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by lowercase email to find duplicates
    const groups = new Map<string, typeof contacts>()
    for (const c of contacts || []) {
      const key = c.email!.toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(c)
    }

    // Filter to groups with more than 1 contact
    const duplicates = Array.from(groups.entries())
      .filter(([, group]) => group.length > 1)
      .map(([email, group]) => ({
        email,
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
    console.error('Duplicates check error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
