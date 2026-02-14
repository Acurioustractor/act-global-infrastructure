import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/embeddings'
import Anthropic from '@anthropic-ai/sdk'

const SECTION_TEMPLATES: Record<string, { label: string; words: number; description: string }> = {
  executive_summary: {
    label: 'Executive Summary',
    words: 200,
    description: 'High-level overview of the project and how it aligns with the grant',
  },
  project_description: {
    label: 'Project Description',
    words: 500,
    description: 'What we will do, how it connects to our existing work, methodology',
  },
  budget_justification: {
    label: 'Budget Justification',
    words: 300,
    description: 'Why the funding is needed and how it will be allocated',
  },
  impact_statement: {
    label: 'Impact Statement',
    words: 300,
    description: 'Expected outcomes, how they will be measured, long-term impact',
  },
  team_expertise: {
    label: 'Team & Expertise',
    words: 200,
    description: 'Who is involved, their track record, organizational capacity',
  },
}

/**
 * POST /api/grants/:id/draft
 * Body: { projectCode: "ACT-JH", sections: ["executive_summary", "project_description"] }
 * Returns: { drafts: { executive_summary: "...", project_description: "..." } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectCode, sections } = body as { projectCode: string; sections: string[] }

    if (!projectCode || !sections || sections.length === 0) {
      return NextResponse.json({ error: 'projectCode and sections[] required' }, { status: 400 })
    }

    // 1. Load grant opportunity + funder documents in parallel
    const [grantResult, funderDocsResult] = await Promise.all([
      supabase.from('grant_opportunities').select('*').eq('id', id).single(),
      supabase.from('grant_funder_documents').select('name, doc_type, content_summary').eq('opportunity_id', id).order('sort_order'),
    ])

    const grant = grantResult.data
    if (grantResult.error || !grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }

    const funderDocs = funderDocsResult.data || []

    // 2. Load project
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('code, name, description, category, lead, status')
      .eq('code', projectCode)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: `Project ${projectCode} not found` }, { status: 404 })
    }

    // 3. RAG: Retrieve relevant knowledge
    let knowledgeItems: Array<{ title: string; content: string; knowledge_type: string }> = []

    // Build search query from grant + project
    const searchQuery = `${grant.name} ${project.name} ${(grant.categories || []).join(' ')}`

    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await generateEmbedding(searchQuery)

        const { data: ragResults } = await supabase.rpc('hybrid_memory_search', {
          query_embedding: JSON.stringify(embedding),
          p_project_code: projectCode,
          match_threshold: 0.15,
          match_count: 10,
        })

        knowledgeItems = (ragResults || []).map((r: { title: string; content: string; metadata: { knowledge_type?: string } }) => ({
          title: r.title,
          content: r.content,
          knowledge_type: r.metadata?.knowledge_type || 'general',
        }))
      } catch (ragErr) {
        console.warn('RAG retrieval failed, proceeding without knowledge:', ragErr)
      }
    }

    // Fallback: get recent knowledge items by project code
    if (knowledgeItems.length === 0) {
      const { data: fallbackKnowledge } = await supabase
        .from('project_knowledge')
        .select('title, content, knowledge_type')
        .eq('project_code', projectCode)
        .order('recorded_at', { ascending: false })
        .limit(10)

      knowledgeItems = fallbackKnowledge || []
    }

    // 4. Generate drafts using Claude Sonnet
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const knowledgeContext = knowledgeItems
      .slice(0, 10)
      .map((k, i) => `[${i + 1}] ${k.title}: ${(k.content || '').slice(0, 500)}`)
      .join('\n\n')

    // Build rich grant context from structured data
    const structure = grant.grant_structure as Record<string, unknown> | null
    const funderInfo = grant.funder_info as Record<string, unknown> | null
    const eligibility = grant.eligibility_criteria as Array<{ criterion: string; description: string }> | null
    const assessmentCriteria = grant.assessment_criteria as Array<{ name: string; description: string; weight_pct: number }> | null

    const grantContext = [
      `Grant: ${grant.name}`,
      `Provider: ${grant.provider}`,
      grant.program ? `Program: ${grant.program}` : '',
      grant.amount_min || grant.amount_max
        ? `Amount: $${grant.amount_min || '?'} - $${grant.amount_max || '?'}`
        : '',
      structure?.amount_per_year ? `Funding: $${structure.amount_per_year}/year for ${structure.duration_years} years ($${structure.total_amount} total)` : '',
      structure?.evaluation_note ? `Evaluation requirement: ${structure.evaluation_note}` : '',
      structure?.number_of_grants ? `Number of grants: ${structure.number_of_grants}` : '',
      grant.categories ? `Categories: ${(grant.categories as string[]).join(', ')}` : '',
      grant.focus_areas ? `Focus areas: ${(grant.focus_areas as string[]).join(', ')}` : '',
      funderInfo?.about ? `About funder: ${funderInfo.about}` : '',
    ].filter(Boolean).join('\n')

    // Eligibility context
    const eligibilityContext = eligibility && eligibility.length > 0
      ? `\nELIGIBILITY CRITERIA (from funder):\n${eligibility.map(e => `- ${e.criterion}: ${e.description}`).join('\n')}`
      : ''

    // Assessment criteria context
    const assessmentContext = assessmentCriteria && assessmentCriteria.length > 0
      ? `\nASSESSMENT CRITERIA (how the funder scores applications):\n${assessmentCriteria.map(c => `- ${c.name} (${c.weight_pct}% weight): ${c.description}`).join('\n')}`
      : ''

    // Funder documents key points
    const funderDocsContext = funderDocs.length > 0
      ? `\nFUNDER DOCUMENT INSIGHTS:\n${funderDocs.map(doc => {
          const summary = doc.content_summary as Record<string, unknown> | null
          const keyPoints = (summary?.key_points as string[]) || []
          return keyPoints.length > 0
            ? `${doc.name}:\n${keyPoints.map(p => `  - ${p}`).join('\n')}`
            : ''
        }).filter(Boolean).join('\n')}`
      : ''

    // Priority cohorts / circumstances
    const priorityContext = structure?.priority_cohorts || structure?.priority_circumstances
      ? `\nPRIORITY FOCUS:\n${(structure.priority_cohorts as string[] || []).map(c => `- Cohort: ${c}`).join('\n')}${(structure.priority_circumstances as string[] || []).map(c => `- Circumstance: ${c}`).join('\n')}`
      : ''

    const projectContext = [
      `Project: ${project.name} (${project.code})`,
      project.description ? `Description: ${project.description}` : '',
      project.category ? `Category: ${project.category}` : '',
      project.lead ? `Lead: ${project.lead}` : '',
    ].filter(Boolean).join('\n')

    const drafts: Record<string, string> = {}

    for (const sectionKey of sections) {
      const template = SECTION_TEMPLATES[sectionKey]
      if (!template) {
        drafts[sectionKey] = `Unknown section: ${sectionKey}`
        continue
      }

      const prompt = `You are a grant writer for ACT (Australian Community Trust), a social enterprise ecosystem based in Queensland, Australia. ACT operates across justice, indigenous, arts, enterprise, regenerative, and community sectors.

Write the "${template.label}" section for this grant application.

GRANT DETAILS:
${grantContext}
${eligibilityContext}
${assessmentContext}
${priorityContext}
${funderDocsContext}

PROJECT DETAILS:
${projectContext}

RELEVANT KNOWLEDGE FROM OUR WORK:
${knowledgeContext || 'No specific knowledge available — use general project information.'}

REQUIREMENTS:
- Section: ${template.label}
- Purpose: ${template.description}
- Target length: ~${template.words} words
- Tone: Professional but passionate, grounded in real work
- Directly address the funder's assessment criteria where relevant — show how we meet their scoring priorities
- Reference the funder's eligibility requirements to demonstrate we qualify
- If priority cohorts/circumstances are listed, highlight our alignment with them
- Reference specific knowledge items where relevant
- Use Australian English spelling
- Do NOT use placeholder brackets like [insert name] — write complete prose

Write ONLY the section content (no heading, no markdown formatting).`

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: template.words * 3,
          messages: [{ role: 'user', content: prompt }],
        })

        drafts[sectionKey] = (response.content[0] as { text: string }).text.trim()
      } catch (err) {
        console.error(`Error generating ${sectionKey}:`, err)
        drafts[sectionKey] = `Error generating this section.`
      }
    }

    // 5. Optionally store drafts in grant_applications
    // Check if an application already exists for this grant + project
    const { data: existingApp } = await supabase
      .from('grant_applications')
      .select('id, documents')
      .eq('opportunity_id', id)
      .eq('project_code', projectCode)
      .single()

    if (existingApp) {
      // Merge new drafts into existing documents
      const existingDocs = (existingApp.documents as Record<string, unknown>) || {}
      const updatedDocs = { ...existingDocs, drafts: { ...(existingDocs.drafts as Record<string, unknown> || {}), ...drafts } }
      await supabase
        .from('grant_applications')
        .update({ documents: updatedDocs })
        .eq('id', existingApp.id)
    }

    return NextResponse.json({
      drafts,
      knowledgeUsed: knowledgeItems.length,
      sections: Object.keys(SECTION_TEMPLATES),
    })
  } catch (error) {
    console.error('Error generating grant draft:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}

/**
 * GET /api/grants/:id/draft — returns available section templates
 */
export async function GET() {
  return NextResponse.json({ sections: SECTION_TEMPLATES })
}
