import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface DextVendor {
  name: string
  aliases: string[]
  auto_publish: boolean
  category: string
  tax_rate: string
  tracking: string
  avg_amount?: number
  frequency?: string
  note?: string
  no_receipt_required?: boolean
}

interface DextRulesConfig {
  auto_publish_rules: Record<string, { description: string; vendors: DextVendor[] }>
  bank_fees: { vendors: DextVendor[] }
  setup_checklist: string[]
}

export async function GET() {
  try {
    // Load rules from config file
    const configPath = join(process.cwd(), '../../config/dext-supplier-rules.json')
    const configRaw = await readFile(configPath, 'utf-8')
    const config: DextRulesConfig = JSON.parse(configRaw)

    // Flatten all vendors from all categories
    const allVendors: (DextVendor & { section: string })[] = []

    for (const [section, group] of Object.entries(config.auto_publish_rules)) {
      for (const vendor of group.vendors) {
        allVendors.push({ ...vendor, section })
      }
    }

    for (const vendor of config.bank_fees.vendors) {
      allVendors.push({ ...vendor, section: 'bank_fees', auto_publish: false })
    }

    // Load setup status from DB
    const { data: statuses } = await supabase
      .from('dext_supplier_setup_status')
      .select('vendor_name, configured_in_dext, configured_at, notes')

    const statusMap = new Map(
      (statuses || []).map(s => [s.vendor_name, s])
    )

    // Get transaction counts per vendor for sorting
    const { data: txCounts } = await supabase.rpc('exec_sql', {
      query: `SELECT contact_name, COUNT(*) as count FROM xero_transactions WHERE contact_name IS NOT NULL GROUP BY contact_name`
    })

    const countMap = new Map<string, number>()
    if (Array.isArray(txCounts)) {
      for (const row of txCounts) {
        countMap.set((row.contact_name || '').toLowerCase(), Number(row.count) || 0)
      }
    }

    // Merge vendor data with status and counts
    const vendors = allVendors.map(v => {
      const status = statusMap.get(v.name)
      const txCount = v.aliases.reduce((max, alias) => {
        const count = countMap.get(alias.toLowerCase()) || 0
        return Math.max(max, count)
      }, countMap.get(v.name.toLowerCase()) || 0)

      return {
        name: v.name,
        aliases: v.aliases,
        autoPublish: v.auto_publish,
        category: v.category,
        taxRate: v.tax_rate,
        tracking: v.tracking,
        avgAmount: v.avg_amount,
        frequency: v.frequency,
        note: v.note,
        section: v.section,
        noReceiptRequired: v.no_receipt_required,
        configured: status?.configured_in_dext ?? false,
        configuredAt: status?.configured_at,
        configNotes: status?.notes,
        txCount,
      }
    })

    // Sort: unconfigured first, then by transaction count descending
    vendors.sort((a, b) => {
      if (a.configured !== b.configured) return a.configured ? 1 : -1
      return b.txCount - a.txCount
    })

    return NextResponse.json({
      vendors,
      checklist: config.setup_checklist,
      totalRules: vendors.length,
      configured: vendors.filter(v => v.configured).length,
    })
  } catch (e) {
    console.error('Dext setup API error:', e)
    return NextResponse.json(
      { error: 'Failed to load Dext setup data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vendorName, configured, notes } = await request.json() as {
      vendorName: string
      configured: boolean
      notes?: string
    }

    const { error } = await supabase
      .from('dext_supplier_setup_status')
      .upsert({
        vendor_name: vendorName,
        configured_in_dext: configured,
        configured_at: configured ? new Date().toISOString() : null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'vendor_name' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Dext setup update error:', e)
    return NextResponse.json(
      { error: 'Failed to update setup status' },
      { status: 500 }
    )
  }
}
