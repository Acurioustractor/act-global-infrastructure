import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .select('*')
      .eq('status', 'open')
      .order('closes_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      opportunities: (data || []).map(o => ({
        id: o.id,
        name: o.name,
        provider: o.provider,
        program: o.program,
        amountMin: o.amount_min,
        amountMax: o.amount_max,
        closesAt: o.closes_at,
        fitScore: o.fit_score,
        eligibilityScore: o.eligibility_score,
        alignedProjects: o.aligned_projects,
        categories: o.categories,
        url: o.url,
      })),
    })
  } catch (error) {
    console.error('Error in grant opportunities:', error)
    return NextResponse.json({ opportunities: [] }, { status: 500 })
  }
}
