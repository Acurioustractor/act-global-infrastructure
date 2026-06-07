import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)

    // Fetch all required data
    const [itemsRes, documentsRes] = await Promise.all([
      supabase.from('compliance_items').select('*'),
      supabase.from('tracked_documents').select('*'),
    ])

    if (itemsRes.error || documentsRes.error) {
      throw new Error('Failed to fetch compliance data')
    }

    const rawItems = itemsRes.data || []
    const rawDocuments = documentsRes.data || []

    // Transform items to frontend ComplianceItem shape
    const items = rawItems.map((item: any) => {
      const nextDue = new Date(item.next_due || item.due_date)
      let status: 'overdue' | 'due-soon' | 'upcoming' | 'completed' = 'upcoming'
      if (item.status === 'completed') {
        status = 'completed'
      } else if (nextDue < now) {
        status = 'overdue'
      } else if (nextDue <= new Date(now.getTime() + 14 * 86400000)) {
        status = 'due-soon'
      }

      return {
        id: item.id,
        title: item.title,
        category: item.category || 'reporting',
        dueDate: item.next_due || item.due_date,
        responsiblePerson: item.responsible || 'Unassigned',
        status,
        frequency: item.frequency || undefined,
        notes: item.notes || undefined,
      }
    })

    // Transform documents to frontend Document shape
    const documents = rawDocuments.map((doc: any) => {
      const expiryDate = new Date(doc.expiry_date)
      let docStatus: 'expired' | 'expiring-soon' | 'valid' = 'valid'
      if (expiryDate < now) {
        docStatus = 'expired'
      } else if (expiryDate <= new Date(now.getTime() + 30 * 86400000)) {
        docStatus = 'expiring-soon'
      }

      return {
        id: doc.id,
        name: doc.name,
        type: doc.document_type || 'Other',
        expiryDate: doc.expiry_date,
        category: doc.project_code || 'reporting',
        status: docStatus,
      }
    })

    // Calculate metrics (flattened to top level for frontend)
    const overdueItems = items.filter((item: any) => item.status === 'overdue').length

    const itemsDueThisMonth = items.filter((item: any) => {
      const due = new Date(item.dueDate)
      return due >= now && due <= monthEnd
    }).length

    const totalDocuments = documents.length

    // Find next upcoming deadline
    const futureItems = items
      .filter((item: any) => item.status !== 'completed' && item.status !== 'overdue')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    let nextDeadline = { item: 'No deadlines', daysUntil: 0 }
    if (futureItems.length > 0) {
      const daysUntil = Math.ceil(
        (new Date(futureItems[0].dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      nextDeadline = { item: futureItems[0].title, daysUntil }
    }

    return NextResponse.json({
      items,
      documents,
      itemsDueThisMonth,
      overdueItems,
      totalDocuments,
      nextDeadline,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
