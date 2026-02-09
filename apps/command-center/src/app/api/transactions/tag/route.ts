import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactName, type, ids, projectCode } = body as {
      contactName?: string
      type?: string
      ids?: string[]
      projectCode: string
    }

    if (!projectCode) {
      return NextResponse.json({ error: 'projectCode is required' }, { status: 400 })
    }

    let updated = 0

    if (ids && ids.length > 0) {
      // Tag specific transactions by ID
      const { data, error } = await supabase
        .from('xero_transactions')
        .update({ project_code: projectCode })
        .in('id', ids)
        .select('id')

      if (error) throw error
      updated = data?.length || 0
    } else if (contactName) {
      // Tag all transactions matching contact_name + type
      let query = supabase
        .from('xero_transactions')
        .update({ project_code: projectCode })
        .eq('contact_name', contactName)
        .or('project_code.is.null,project_code.eq.')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query.select('id')
      if (error) throw error
      updated = data?.length || 0
    } else {
      return NextResponse.json(
        { error: 'Either contactName or ids must be provided' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, updated })
  } catch (e) {
    console.error('Tag transactions error:', e)
    return NextResponse.json(
      { error: 'Failed to tag transactions' },
      { status: 500 }
    )
  }
}
