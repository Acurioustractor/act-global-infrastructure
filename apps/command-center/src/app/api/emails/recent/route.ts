import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Parse name from raw email header: "Ben Knight <ben@act.place>" → "Ben Knight"
function parseSenderName(raw: string | null): string | null {
  if (!raw) return null
  const match = raw.match(/^"?([^"<]+?)"?\s*</)
  if (match) return match[1].trim()
  // No angle brackets — it's just an email address
  return null
}

// Extract email from header: "Ben Knight <ben@act.place>" → "ben@act.place"
function parseSenderEmail(raw: string | null): string | null {
  if (!raw) return null
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1] : raw.trim()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data, error } = await supabase
      .from('communications_history')
      .select('*, ghl_contacts(full_name, email)')
      .eq('channel', 'email')
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const emails = (data || []).map((e) => {
      // Derive sender: GHL contact name (best) → parsed From header → email address
      const rawFrom = e.metadata?.from as string | null
      const contactName = (e.ghl_contacts as { full_name: string; email: string } | null)?.full_name
      const senderName = contactName || parseSenderName(rawFrom) || parseSenderEmail(rawFrom) || 'Unknown'

      return {
        id: e.id,
        subject: e.subject || 'No subject',
        from: senderName,
        snippet: e.content_preview || e.summary || '',
        date: e.occurred_at,
        direction: e.direction || 'inbound',
        isReply: e.is_reply || false,
        requiresResponse: e.requires_response || false,
        sentiment: e.sentiment || null,
        topics: e.topics || [],
        summary: e.summary || null,
        read: true,
      }
    })

    return NextResponse.json({ success: true, emails })
  } catch (e) {
    console.error('Recent emails error:', e)
    return NextResponse.json({ success: true, emails: [] })
  }
}
