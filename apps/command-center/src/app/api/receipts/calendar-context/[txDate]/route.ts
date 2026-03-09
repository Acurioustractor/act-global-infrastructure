import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txDate: string }> }
) {
  try {
    const { txDate } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const vendor = searchParams.get('vendor') || ''

    const startDate = new Date(txDate)
    startDate.setDate(startDate.getDate() - days)
    const endDate = new Date(txDate)
    endDate.setDate(endDate.getDate() + days)

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    if (error) throw error

    const allEvents = events || []

    // Score events by relevance to the vendor/transaction
    const vendorLower = vendor.toLowerCase()
    const scored = allEvents.map(event => {
      let relevance = 0
      const title = (event.title || '').toLowerCase()
      const location = (event.location || '').toLowerCase()
      const description = (event.description || '').toLowerCase()

      // Vendor name match in title/location/description
      if (vendorLower && (
        title.includes(vendorLower) ||
        location.includes(vendorLower) ||
        description.includes(vendorLower)
      )) {
        relevance += 10
      }

      // Travel-related keywords (explains receipts from different cities)
      const travelKeywords = ['flight', 'airport', 'hotel', 'travel', 'trip', 'conference', 'drive']
      if (travelKeywords.some(kw => title.includes(kw) || location.includes(kw))) {
        relevance += 5
      }

      // Food/dining keywords (explains restaurant receipts)
      const diningKeywords = ['lunch', 'dinner', 'breakfast', 'coffee', 'meeting', 'catch up']
      if (diningKeywords.some(kw => title.includes(kw))) {
        relevance += 3
      }

      // Events with locations are more useful for receipt context
      if (event.location) {
        relevance += 2
      }

      // Same day as transaction gets a boost
      const eventDate = new Date(event.start_time).toISOString().split('T')[0]
      if (eventDate === txDate) {
        relevance += 4
      }

      return { ...event, relevance }
    })

    // Sort by relevance (highest first), then by date proximity
    scored.sort((a, b) => b.relevance - a.relevance)

    // Split into vendor-matched and contextual
    const vendorMatched = scored.filter(e => e.relevance >= 10)
    const contextual = scored.filter(e => e.relevance > 0 && e.relevance < 10).slice(0, 10)

    return NextResponse.json({
      success: true,
      events: allEvents,
      vendor_matched: vendorMatched,
      contextual,
      count: allEvents.length,
      hint: vendorMatched.length > 0
        ? `Found ${vendorMatched.length} calendar event(s) matching "${vendor}"`
        : contextual.length > 0
          ? `${contextual.length} nearby events may explain this transaction`
          : null,
    })
  } catch (e) {
    console.error('Calendar context error:', e)
    return NextResponse.json({
      success: true,
      events: [],
      vendor_matched: [],
      contextual: [],
      count: 0,
      hint: null,
    })
  }
}
