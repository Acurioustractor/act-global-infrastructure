import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Fetch all required data
    const [assetsRes, maintenanceRes, propertiesRes, lodgingsRes] = await Promise.all([
      supabase.from('assets').select('*').eq('status', 'active'),
      supabase.from('asset_maintenance').select('*'),
      supabase.from('properties').select('*').eq('is_active', true),
      supabase.from('lodgings').select('*').neq('status', 'decommissioned'),
    ])

    if (assetsRes.error || maintenanceRes.error || propertiesRes.error || lodgingsRes.error) {
      throw new Error('Failed to fetch asset data')
    }

    const rawAssets = assetsRes.data || []
    const rawMaintenance = maintenanceRes.data || []
    const lodgingsRaw = lodgingsRes.data || []

    // Build asset name lookup for maintenance tasks
    const assetNameMap: Record<string, string> = {}
    rawAssets.forEach((a: any) => { assetNameMap[a.id] = a.name })

    // Find next maintenance date per asset from maintenance table
    const nextMaintenanceByAsset: Record<string, string> = {}
    const lastMaintenanceByAsset: Record<string, string> = {}
    rawMaintenance.forEach((m: any) => {
      if (m.asset_id && m.next_due) {
        if (!nextMaintenanceByAsset[m.asset_id] || m.next_due < nextMaintenanceByAsset[m.asset_id]) {
          nextMaintenanceByAsset[m.asset_id] = m.next_due
        }
      }
      if (m.asset_id && m.last_completed) {
        if (!lastMaintenanceByAsset[m.asset_id] || m.last_completed > lastMaintenanceByAsset[m.asset_id]) {
          lastMaintenanceByAsset[m.asset_id] = m.last_completed
        }
      }
    })

    // Transform assets to frontend Asset shape
    const assets = rawAssets.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.asset_type || a.sub_type || 'Unknown',
      zone: a.location_zone || 'common',
      condition: a.condition || 'good',
      value: Number(a.current_value) || 0,
      nextMaintenanceDate: nextMaintenanceByAsset[a.id] || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      lastMaintenanceDate: lastMaintenanceByAsset[a.id] || undefined,
    }))

    // Transform maintenance to frontend MaintenanceTask shape
    const maintenanceTasks = rawMaintenance
      .filter((m: any) => {
        const dueDate = new Date(m.next_due)
        return dueDate <= thirtyDaysFromNow || m.status === 'overdue'
      })
      .map((m: any) => {
        const dueDate = new Date(m.next_due)
        let status: 'overdue' | 'due-soon' | 'scheduled' = 'scheduled'
        if (dueDate < now) status = 'overdue'
        else if (dueDate <= new Date(now.getTime() + 7 * 86400000)) status = 'due-soon'

        return {
          id: m.id,
          assetName: assetNameMap[m.asset_id] || 'Unknown Asset',
          task: m.title || 'Maintenance',
          dueDate: m.next_due,
          status,
          priority: m.status === 'overdue' ? 'high' as const : 'medium' as const,
        }
      })
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    // Transform lodgings to frontend Lodging shape
    const lodgings = lodgingsRaw.map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.lodging_type || 'cabin',
      capacity: l.capacity || 0,
      status: l.status || 'available',
      currentOccupant: l.current_occupant || undefined,
      nightlyRate: 0, // Not tracked in DB yet
    }))

    // Calculate metrics (flattened to top level for frontend)
    const totalAssetValue = rawAssets.reduce((sum: number, a: any) => sum + (Number(a.current_value) || 0), 0)
    const assetsNeedingAttention = rawAssets.filter((a: any) => a.condition === 'poor' || a.condition === 'critical').length
    const upcomingMaintenanceCount = maintenanceTasks.length
    const lodgingCapacity = lodgingsRaw.reduce((sum: number, l: any) => sum + (l.capacity || 0), 0)

    return NextResponse.json({
      totalAssetValue,
      assetsNeedingAttention,
      upcomingMaintenanceCount,
      lodgingCapacity,
      assets,
      maintenanceTasks,
      lodgings,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { data, error } = await supabase.from('assets').insert([body]).select()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
