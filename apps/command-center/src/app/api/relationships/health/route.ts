import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all contacts
    const { data: contacts, error } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, engagement_status, last_contact_date, tags, projects')

    if (error) throw error

    const all = contacts || []
    const now = new Date()

    let hot = 0, warm = 0, cool = 0, needsAttention = 0, overdue = 0
    const byStage: Record<string, number> = { listen: 0, connect: 0, act: 0, amplify: 0 }

    for (const c of all) {
      // Derive temperature from engagement recency
      const daysSince = c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      if (daysSince <= 14) hot++
      else if (daysSince <= 60) warm++
      else cool++

      if (daysSince > 30) overdue++
      if (daysSince > 14 && daysSince <= 60) needsAttention++

      // Map engagement_status to LCAA stages
      const status = (c.engagement_status || 'lead').toLowerCase()
      if (status === 'lead' || status === 'new') byStage.listen++
      else if (status === 'engaged' || status === 'prospect') byStage.connect++
      else if (status === 'active' || status === 'customer') byStage.act++
      else if (status === 'advocate' || status === 'partner') byStage.amplify++
      else byStage.listen++
    }

    return NextResponse.json({
      hot,
      warm,
      cool,
      total: all.length,
      needsAttention,
      overdue,
      byStage,
    })
  } catch (e) {
    console.error('Relationship health error:', e)
    return NextResponse.json({
      hot: 0, warm: 0, cool: 0, total: 0,
      needsAttention: 0, overdue: 0,
      byStage: { listen: 0, connect: 0, act: 0, amplify: 0 },
    })
  }
}
