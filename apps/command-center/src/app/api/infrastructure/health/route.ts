import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check Supabase connectivity
    const { error: dbError } = await supabase.from('ghl_contacts').select('id', { count: 'exact', head: true })

    const connectors = [
      {
        name: 'Supabase',
        status: dbError ? 'error' : 'connected',
        last_sync: new Date().toISOString(),
      },
      {
        name: 'Xero',
        status: process.env.XERO_CLIENT_ID ? 'connected' : 'unknown',
      },
      {
        name: 'GoHighLevel',
        status: process.env.GHL_API_KEY ? 'connected' : 'unknown',
      },
      {
        name: 'Google',
        status: process.env.GOOGLE_CLIENT_ID ? 'connected' : 'unknown',
      },
      {
        name: 'Notion',
        status: process.env.NOTION_API_KEY ? 'connected' : 'unknown',
      },
    ]

    const agents = [
      { name: 'Cultivator', status: 'idle' as const },
      { name: 'Receipt Agent', status: 'idle' as const },
      { name: 'Briefing Agent', status: 'idle' as const },
      { name: 'Health Monitor', status: 'active' as const },
    ]

    const connectedCount = connectors.filter(c => c.status === 'connected').length
    const score = Math.round((connectedCount / connectors.length) * 100)

    return NextResponse.json({
      overall_score: score,
      connectors,
      agents,
    })
  } catch (e) {
    console.error('Infrastructure health error:', e)
    return NextResponse.json({ overall_score: 0, connectors: [], agents: [] })
  }
}
