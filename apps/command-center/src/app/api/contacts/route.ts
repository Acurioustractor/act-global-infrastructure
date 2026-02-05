import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlCreateContact } from '@/lib/ghl'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Create in GHL first to get the GHL ID
    const ghlContact = await ghlCreateContact({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.companyName,
      website: body.website,
      tags: body.tags || ['goods'],
    })

    // Insert into Supabase
    const fullName = `${body.firstName || ''} ${body.lastName || ''}`.trim() || body.email
    const { data, error } = await supabase
      .from('ghl_contacts')
      .insert({
        ghl_id: ghlContact.id,
        email: body.email,
        first_name: body.firstName || null,
        last_name: body.lastName || null,
        full_name: fullName,
        company_name: body.companyName || null,
        website: body.website || null,
        tags: body.tags || ['goods'],
        sync_source: 'dashboard',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contact: data }, { status: 201 })
  } catch (e) {
    console.error('Contact creation error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
