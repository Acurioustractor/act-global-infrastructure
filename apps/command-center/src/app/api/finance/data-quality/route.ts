import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Query data quality scores view
    const { data: scores, error: scoresError } = await supabase
      .from('v_data_quality_scores')
      .select('*')

    if (scoresError) {
      // Fallback: compute inline if view doesn't exist yet
      console.error('v_data_quality_scores view error:', scoresError.message)
    }

    // Query top untagged
    const { data: untagged, error: untaggedError } = await supabase
      .from('v_top_untagged')
      .select('*')

    if (untaggedError) {
      console.error('v_top_untagged view error:', untaggedError.message)
    }

    // Get untagged GHL opportunities
    const { data: untaggedOpps } = await supabase
      .from('ghl_opportunities')
      .select('id, name, pipeline_name, stage_name, monetary_value, status')
      .is('project_code', null)
      .order('monetary_value', { ascending: false, nullsFirst: false })
      .limit(30)

    // Build project keyword suggestions for untagged vendors
    const projectKeywords = await buildProjectKeywordMap()

    // Enrich untagged vendors with suggestions
    const enrichedUntagged = (untagged || []).map((vendor: any) => {
      const suggestion = suggestProject(vendor.contact_name, projectKeywords)
      return {
        ...vendor,
        suggested_project: suggestion?.code || null,
        suggested_name: suggestion?.name || null,
        confidence: suggestion?.confidence || 0,
      }
    })

    // Enrich untagged opportunities with suggestions
    const enrichedOpps = (untaggedOpps || []).map((opp: any) => {
      const suggestion = suggestProject(opp.name, projectKeywords)
      return {
        ...opp,
        suggested_project: suggestion?.code || null,
        suggested_name: suggestion?.name || null,
        confidence: suggestion?.confidence || 0,
      }
    })

    // Compute overall score (weighted average)
    const scoreMap: Record<string, any> = {}
    for (const s of scores || []) {
      scoreMap[s.source] = s
    }

    const weights: Record<string, number> = {
      xero_transactions: 0.4,
      xero_invoices: 0.2,
      ghl_opportunities: 0.3,
      subscriptions: 0.1,
    }

    let overallScore = 0
    let totalWeight = 0
    for (const [source, weight] of Object.entries(weights)) {
      if (scoreMap[source]) {
        overallScore += (scoreMap[source].pct || 0) * weight
        totalWeight += weight
      }
    }
    overallScore = totalWeight > 0 ? Math.round(overallScore / totalWeight) : 0

    return NextResponse.json({
      scores: scores || [],
      overallScore,
      topUntagged: enrichedUntagged,
      untaggedOpportunities: enrichedOpps,
    })
  } catch (error) {
    console.error('Data quality API error:', error)
    return NextResponse.json({ error: 'Failed to load data quality' }, { status: 500 })
  }
}

// Batch tag transactions by vendor
export async function POST(request: Request) {
  try {
    const { contactName, projectCode } = await request.json()

    if (!contactName || !projectCode) {
      return NextResponse.json({ error: 'Missing contactName or projectCode' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('xero_transactions')
      .update({ project_code: projectCode, project_code_source: 'manual' })
      .eq('contact_name', contactName)
      .is('project_code', null)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also tag invoices from same contact
    await supabase
      .from('xero_invoices')
      .update({ project_code: projectCode, project_code_source: 'manual' })
      .eq('contact_name', contactName)
      .is('project_code', null)

    return NextResponse.json({ tagged: (data || []).length })
  } catch (error) {
    console.error('Tag transactions error:', error)
    return NextResponse.json({ error: 'Failed to tag transactions' }, { status: 500 })
  }
}

async function buildProjectKeywordMap() {
  const { data: projects } = await supabase
    .from('projects')
    .select('code, name, ghl_tags, xero_tracking')

  const map: Array<{ code: string; name: string; keywords: string[] }> = []

  for (const project of projects || []) {
    const keywords = [
      ...((project.ghl_tags || []) as string[]),
      project.name?.toLowerCase(),
      project.xero_tracking?.toLowerCase(),
    ].filter(Boolean)
    map.push({ code: project.code, name: project.name, keywords })
  }
  return map
}

function suggestProject(
  text: string,
  projectKeywords: Array<{ code: string; name: string; keywords: string[] }>
) {
  if (!text) return null
  const lower = text.toLowerCase()

  let best: { code: string; name: string; confidence: number } | null = null

  for (const project of projectKeywords) {
    for (const keyword of project.keywords) {
      if (lower.includes(keyword) && keyword.length > 2) {
        const confidence = keyword.length / Math.max(lower.length, 1)
        if (!best || confidence > best.confidence) {
          best = { code: project.code, name: project.name, confidence: Math.min(confidence * 2, 1) }
        }
      }
    }
  }

  return best
}
