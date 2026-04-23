import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

// Lazy-initialised so Vercel preview builds (no ANTHROPIC_API_KEY) don't fail
// at module load during `next build` page-data collection.
function getAnthropicClient() {
  return new Anthropic()
}

export async function POST(request: NextRequest) {
  try {
    const { vendorName, type, total, count } = (await request.json()) as {
      vendorName: string
      type: string
      total: number
      count: number
    }

    if (!vendorName) {
      return NextResponse.json({ error: 'vendorName is required' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()

    // Load existing project codes and vendor rules for context
    const [{ data: projects }, { data: rules }] = await Promise.all([
      supabase.from('projects').select('code, name, category, metadata'),
      supabase.from('vendor_project_rules').select('vendor_name, project_code').limit(50),
    ])

    const activeProjects = (projects || []).filter((p: { metadata?: { legacy_wrapper?: boolean } | null }) => !p.metadata?.legacy_wrapper)
    const projectList = activeProjects.map(p => `${p.code}: ${p.name} (${p.category})`).join('\n')
    const ruleExamples = (rules || []).slice(0, 20).map(r => `${r.vendor_name} → ${r.project_code}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: `You are a transaction classifier for ACT (A Curious Tractor), an Australian nonprofit ecosystem. Given a vendor name and transaction details, suggest the most likely project code.

Available project codes:
${projectList}

Example vendor→project mappings:
${ruleExamples}

Rules:
- Respond with ONLY the project code (e.g. "ACT-CORE") or "UNKNOWN" if you can't determine it
- Prefer canonical project codes for new work. Do NOT suggest legacy wrapper codes like ACT-HQ or ACT-PC.
- ACT-CORE is for general studio operations, admin, and shared ecosystem overhead
- ACT-EL is Empathy Ledger (tech platform)
- ACT-IN is Intelligence/AI/Bot
- ACT-GD is Goods on Country (laundry/community services)
- ACT-JH is JusticeHub (justice/legal tech)
- ACT-PI is PICC / Palm Island work
- Software/SaaS vendors are usually ACT-IN or ACT-EL
- Travel to Palm Island/Darwin is usually ACT-GD or ACT-PS`,
      messages: [
        {
          role: 'user',
          content: `Vendor: "${vendorName}"\nTransaction type: ${type}\nTotal: $${total}\nCount: ${count} transactions\n\nWhat project code should this be?`,
        },
      ],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text.trim())
      .join('')

    // Validate the suggestion is a real project code
    const validCodes = new Set(activeProjects.map(p => p.code))
    const suggestedCode = validCodes.has(text) ? text : null

    return NextResponse.json({
      suggestion: suggestedCode,
      raw: text,
      confidence: suggestedCode ? 'ai' : 'unknown',
    })
  } catch (error) {
    console.error('Transaction suggest error:', error)
    return NextResponse.json({ error: 'Failed to get suggestion' }, { status: 500 })
  }
}
