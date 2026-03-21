import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactName, type, ids, projectCode, saveAsRule, category } = body as {
      contactName?: string
      type?: string
      ids?: string[]
      projectCode: string
      saveAsRule?: boolean
      category?: string
    }

    if (!projectCode) {
      return NextResponse.json({ error: 'projectCode is required' }, { status: 400 })
    }

    let updatedTransactions = 0
    let updatedInvoices = 0

    if (ids && ids.length > 0) {
      // Tag specific transactions by ID
      const { data, error } = await supabase
        .from('xero_transactions')
        .update({ project_code: projectCode, project_code_source: 'manual' })
        .in('id', ids)
        .select('id')

      if (error) throw error
      updatedTransactions = data?.length || 0

      // Also try tagging invoices with same IDs
      const { data: invData } = await supabase
        .from('xero_invoices')
        .update({ project_code: projectCode, project_code_source: 'manual' })
        .in('id', ids)
        .select('id')
      updatedInvoices = invData?.length || 0
    } else if (contactName) {
      // Tag all transactions matching contact_name
      let query = supabase
        .from('xero_transactions')
        .update({ project_code: projectCode, project_code_source: 'manual' })
        .eq('contact_name', contactName)
        .or('project_code.is.null,project_code.eq.')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query.select('id')
      if (error) throw error
      updatedTransactions = data?.length || 0

      // Also tag matching invoices by contact_name
      const { data: invData } = await supabase
        .from('xero_invoices')
        .update({ project_code: projectCode, project_code_source: 'manual' })
        .eq('contact_name', contactName)
        .or('project_code.is.null,project_code.eq.')
        .select('id')
      updatedInvoices = invData?.length || 0
    } else {
      return NextResponse.json(
        { error: 'Either contactName or ids must be provided' },
        { status: 400 }
      )
    }

    const updated = updatedTransactions + updatedInvoices

    // Optionally save as a vendor rule for future auto-tagging
    if (saveAsRule && contactName && updated > 0) {
      await supabase
        .from('vendor_project_rules')
        .upsert({
          vendor_name: contactName,
          project_code: projectCode,
          category: category || 'Operations',
          auto_apply: true,
          rd_eligible: false,
          aliases: [],
        }, { onConflict: 'vendor_name' })
    }

    return NextResponse.json({
      success: true,
      updated,
      updatedTransactions,
      updatedInvoices,
      ruleSaved: saveAsRule && !!contactName,
    })
  } catch (e) {
    console.error('Tag transactions error:', e)
    return NextResponse.json(
      { error: 'Failed to tag transactions' },
      { status: 500 }
    )
  }
}
