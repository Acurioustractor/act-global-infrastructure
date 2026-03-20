import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic()

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

    // Load existing project codes and vendor rules for context
    const [{ data: projects }, { data: rules }] = await Promise.all([
      supabase.from('projects').select('code, name, category'),
      supabase.from('vendor_project_rules').select('vendor_name, project_code').limit(50),
    ])

    const projectList = (projects || []).map(p => `${p.code}: ${p.name} (${p.category})`).join('\n')
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
- Respond with ONLY the project code (e.g. "ACT-HQ") or "UNKNOWN" if you can't determine it
- ACT-HQ is for general operations, admin, office supplies
- ACT-EL is Empathy Ledger (tech platform)
- ACT-IN is Intelligence/AI/Bot
- ACT-GD is Goods on Country (laundry/community services)
- ACT-JH is JusticeHub (justice/legal tech)
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
    const validCodes = new Set((projects || []).map(p => p.code))
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
