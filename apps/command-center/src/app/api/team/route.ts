import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all required data
    const [membersRes, allocationsRes, seasonalDemandRes] = await Promise.all([
      supabase.from('team_members').select('*').eq('is_active', true),
      supabase.from('resource_allocations').select('*'),
      supabase.from('seasonal_demand').select('*'),
    ])

    if (membersRes.error || allocationsRes.error || seasonalDemandRes.error) {
      throw new Error('Failed to fetch team data')
    }

    const members = membersRes.data || []
    const allocations = allocationsRes.data || []

    // Transform members into frontend TeamMember shape
    const teamMembers = members.map((member: any) => {
      const memberAllocations = allocations.filter((a: any) => a.team_member_id === member.id)
      const allocatedHours = memberAllocations.reduce((sum: number, a: any) => sum + (Number(a.hours_per_week) || 0), 0)
      const availableHours = Number(member.available_hours_per_week) || 0

      return {
        id: member.id,
        name: member.name,
        role: member.role,
        employment: member.employment_type || 'contractor',
        availableHours,
        allocatedHours,
        projects: memberAllocations.map((a: any) => ({
          name: a.project_code || 'Unassigned',
          hours: Number(a.hours_per_week) || 0,
        })),
      }
    })

    // Calculate aggregate metrics
    const totalWeeklyHours = members.reduce((sum: number, m: any) => sum + (Number(m.available_hours_per_week) || 0), 0)
    const totalAllocatedHours = allocations.reduce((sum: number, a: any) => sum + (Number(a.hours_per_week) || 0), 0)
    const utilisationPercent = totalWeeklyHours > 0 ? Math.round((totalAllocatedHours / totalWeeklyHours) * 100) : 0
    const availableCapacity = totalWeeklyHours - totalAllocatedHours

    // Calculate zone capacity
    const zoneCapacity: Record<string, number> = {}
    members.forEach((m: any) => {
      const zone = m.primary_zone || 'General'
      zoneCapacity[zone] = (zoneCapacity[zone] || 0) + (Number(m.available_hours_per_week) || 0)
    })

    // Collect skills inventory
    const skillsSet = new Set<string>()
    members.forEach((m: any) => {
      if (Array.isArray(m.skills)) {
        m.skills.forEach((s: string) => skillsSet.add(s))
      }
    })
    const skillsInventory = Array.from(skillsSet).sort()

    // Calculate monthly cost
    const monthlyCost = members.reduce((sum: number, m: any) => {
      if (m.annual_salary) return sum + Number(m.annual_salary) / 12
      if (m.hourly_rate && m.available_hours_per_week) {
        return sum + Number(m.hourly_rate) * Number(m.available_hours_per_week) * 4.33
      }
      return sum
    }, 0)

    // Hiring alerts (zones where utilisation > 90%)
    const hiringAlerts: Array<{ zone: string; deficit: number }> = []
    Object.entries(zoneCapacity).forEach(([zone, capacity]) => {
      const zoneAllocated = members
        .filter((m: any) => (m.primary_zone || 'General') === zone)
        .reduce((sum: number, m: any) => {
          const memberAllocs = allocations.filter((a: any) => a.team_member_id === m.id)
          return sum + memberAllocs.reduce((s: number, a: any) => s + (Number(a.hours_per_week) || 0), 0)
        }, 0)

      const zoneUtil = capacity > 0 ? (zoneAllocated / capacity) * 100 : 0
      if (zoneUtil > 90) {
        hiringAlerts.push({ zone, deficit: Math.ceil(zoneAllocated - capacity * 0.8) })
      }
    })

    return NextResponse.json({
      teamMembers,
      totalWeeklyHours,
      utilisationPercent,
      availableCapacity,
      zoneCapacity,
      skillsInventory,
      hiringAlerts,
      monthlyCost: Math.round(monthlyCost),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
