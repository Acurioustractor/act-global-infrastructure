/**
 * ACT Living Wiki - AI Knowledge Extraction API
 *
 * Uses Mistral/Claude to extract structured knowledge from raw content
 *
 * Takes raw content from Notion/Gmail/Calendar/etc and:
 * 1. Identifies knowledge type (Principle/Method/Practice/Procedure/Guide/Template)
 * 2. Generates clean title
 * 3. Rewrites content as wiki page
 * 4. Suggests tags and categorization
 * 5. Assigns confidence score
 */

import { NextRequest, NextResponse } from 'next/server';

const EXTRACTION_PROMPT = `You are analyzing content from ACT's daily tools to extract actionable knowledge for their Living Wiki.

ACT follows the PMPP Framework:
- **Principles**: Core values that guide decisions (e.g., "Community Ownership", "Beautiful Obsolescence")
- **Methods**: Frameworks and approaches (e.g., "LCAA Framework", "Consent-Based Decision Making")
- **Practices**: How recurring activities are done (e.g., "Weekly Team Meetings", "Project Check-ins")
- **Procedures**: Step-by-step processes (e.g., "How to Onboard a New Partner", "Grant Application Process")
- **Guides**: Educational content or tutorials
- **Templates**: Reusable documents or formats

Analyze this content and extract structured knowledge:

---
SOURCE TITLE: {source_title}

CONTENT:
{content}
---

Return a JSON object with:
{
  "isKnowledge": true/false,  // Is this worth adding to wiki?
  "type": "principle" | "method" | "practice" | "procedure" | "guide" | "template",
  "title": "Clear, searchable title",
  "content": "Rewritten as a clean wiki page in markdown",
  "excerpt": "1-2 sentence summary",
  "tags": ["relevant", "tags"],
  "projects": ["justicehub", "empathy-ledger", "act-farm", etc],  // Which ACT projects this relates to
  "domains": ["operations", "technology", "agriculture", etc],
  "confidence": 0.0-1.0,  // How confident you are this is valuable knowledge
  "reasoning": "Why you classified it this way"
}

IMPORTANT:
- Only extract if this is reusable knowledge, not one-off notes or todos
- Rewrite content to be timeless and clear (remove "we discussed today", use "our practice is...")
- Focus on the "why" and "how", not just "what"
- Use ACT's voice: practical, values-driven, community-focused
- If confidence < 0.5, set isKnowledge to false`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueId, sourceTitle, content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Extracting knowledge from: ${sourceTitle || 'Untitled'}`);

    // Prepare prompt
    const prompt = EXTRACTION_PROMPT
      .replace('{source_title}', sourceTitle || 'Untitled')
      .replace('{content}', content);

    // Try Mistral first (self-hosted on NAS)
    let result;
    try {
      result = await extractWithMistral(prompt);
    } catch (error) {
      console.warn('⚠️  Mistral failed, falling back to Hugging Face:', error);
      // Fallback to Hugging Face
      result = await extractWithHuggingFace(prompt);
    }

    // Parse AI response
    const extraction = parseAIResponse(result);

    // Update queue item if queueId provided
    if (queueId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await supabase
        .from('knowledge_extraction_queue')
        .update({
          extracted_title: extraction.title,
          extracted_content: extraction.content,
          suggested_type: extraction.type,
          suggested_tags: extraction.tags,
          confidence_score: extraction.confidence,
          ai_reasoning: extraction.reasoning,
          status: extraction.isKnowledge ? 'extracted' : 'rejected',
        })
        .eq('id', queueId);
    }

    return NextResponse.json({
      success: true,
      extraction,
    });
  } catch (error) {
    console.error('❌ Error extracting knowledge:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract knowledge',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract using self-hosted Mistral on NAS
 */
async function extractWithMistral(prompt: string): Promise<string> {
  const response = await fetch('http://192.168.0.34:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral',
      prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more consistent extraction
        top_p: 0.9,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

/**
 * Fallback: Extract using Hugging Face API
 */
async function extractWithHuggingFace(prompt: string): Promise<string> {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.3,
          top_p: 0.9,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0].generated_text;
}

/**
 * Parse AI response into structured extraction
 */
function parseAIResponse(aiResponse: string): any {
  try {
    // Try to extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extraction = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!extraction.type || !extraction.title) {
      throw new Error('Missing required fields in extraction');
    }

    // Set defaults
    return {
      isKnowledge: extraction.isKnowledge ?? true,
      type: extraction.type,
      title: extraction.title,
      content: extraction.content || '',
      excerpt: extraction.excerpt || '',
      tags: extraction.tags || [],
      projects: extraction.projects || [],
      domains: extraction.domains || ['all'],
      confidence: extraction.confidence ?? 0.5,
      reasoning: extraction.reasoning || 'AI extraction',
    };
  } catch (error) {
    console.error('❌ Error parsing AI response:', error);
    console.log('Raw response:', aiResponse);

    // Return default low-confidence extraction
    return {
      isKnowledge: false,
      type: 'guide',
      title: 'Untitled',
      content: aiResponse,
      excerpt: '',
      tags: [],
      projects: [],
      domains: ['all'],
      confidence: 0.1,
      reasoning: 'Failed to parse AI response',
    };
  }
}

/**
 * GET endpoint to check extraction queue status
 */
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get pending extractions
    const { data: pending, count: pendingCount } = await supabase
      .from('knowledge_extraction_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false })
      .limit(10);

    // Get recent extractions
    const { data: recent } = await supabase
      .from('knowledge_extraction_queue')
      .select('*')
      .eq('status', 'extracted')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      pendingCount: pendingCount || 0,
      pendingItems: pending?.map(item => ({
        id: item.id,
        title: item.raw_title,
        type: item.suggested_type,
        confidence: item.confidence_score,
        source: item.source_type,
      })) || [],
      recentExtractions: recent?.map(item => ({
        id: item.id,
        title: item.suggested_title,
        type: item.suggested_type,
        confidence: item.confidence_score,
      })) || [],
    });
  } catch (error) {
    console.error('❌ Error checking extraction queue:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check queue',
      },
      { status: 500 }
    );
  }
}
