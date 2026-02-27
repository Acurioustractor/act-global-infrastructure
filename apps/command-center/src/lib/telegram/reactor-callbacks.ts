/**
 * Reactor Callback Handlers
 *
 * Handles inline keyboard button taps from event reactor notifications.
 * Callback data format: "domain:action:entityId[:extra]"
 *
 * Examples:
 *   grant:apply:abc-123
 *   grant:dismiss:abc-123
 *   ghl:opp:def-456
 *   action:complete:ghi-789
 *   action:defer:ghi-789:7
 *   contact:email:jkl-012
 *   contact:ack:jkl-012
 *   xero:invoice:mno-345
 *   gmail:open:benjamin@act.place
 */

import { supabase } from '@/lib/supabase'
import { processAgentMessage } from '@/lib/agent-loop'

interface CallbackResult {
  /** Short toast shown as Telegram callback answer (max 200 chars) */
  toast?: string
  /** Full reply message sent to the chat */
  reply?: string
  /** Replace the original notification message */
  editMessage?: string
}

export async function handleReactorCallback(
  data: string,
  chatId: number
): Promise<CallbackResult> {
  const parts = data.split(':')
  const domain = parts[0]
  const action = parts[1]
  const entityId = parts.slice(2).join(':') // rejoin in case entityId contains colons (e.g. email addresses)

  switch (domain) {
    case 'grant':
      return handleGrantCallback(action, entityId)
    case 'ghl':
      return handleGHLCallback(action, entityId)
    case 'action':
      return handleActionCallback(action, entityId, parts[3])
    case 'contact':
      return handleContactCallback(action, entityId, chatId)
    case 'xero':
      return handleXeroCallback(action, entityId)
    case 'gmail':
      return handleGmailCallback(action, entityId)
    default:
      return { toast: `Unknown: ${domain}` }
  }
}

async function handleGrantCallback(action: string, entityId: string): Promise<CallbackResult> {
  if (action === 'dismiss') {
    return {
      toast: 'Dismissed',
      editMessage: '(Grant notification dismissed)',
    }
  }

  if (action === 'apply') {
    // Look up the grant
    const { data: grant } = await supabase
      .from('grant_opportunities')
      .select('name, url, provider')
      .eq('id', entityId)
      .maybeSingle()

    if (grant?.url) {
      return {
        toast: 'Opening grant',
        reply: `Grant: ${grant.name}\nProvider: ${grant.provider}\nURL: ${grant.url}`,
      }
    }

    return {
      toast: 'Grant details loaded',
      reply: grant
        ? `Grant: ${grant.name} (${grant.provider})\nNo URL on file — check the grants dashboard.`
        : `Grant ${entityId} not found in database.`,
    }
  }

  return { toast: `Unknown grant action: ${action}` }
}

async function handleGHLCallback(action: string, entityId: string): Promise<CallbackResult> {
  if (action === 'opp') {
    const { data: opp } = await supabase
      .from('ghl_opportunities')
      .select('name, pipeline_name, stage_name, monetary_value, contact_name')
      .eq('ghl_id', entityId)
      .maybeSingle()

    if (!opp) return { toast: 'Opportunity not found' }

    const value = opp.monetary_value
      ? `\nValue: $${Number(opp.monetary_value).toLocaleString('en-AU')}`
      : ''

    return {
      toast: 'Loaded opportunity',
      reply: `${opp.name}\nPipeline: ${opp.pipeline_name}\nStage: ${opp.stage_name}\nContact: ${opp.contact_name || 'Unknown'}${value}`,
    }
  }

  return { toast: `Unknown GHL action: ${action}` }
}

async function handleActionCallback(
  action: string,
  entityId: string,
  extra?: string
): Promise<CallbackResult> {
  if (action === 'complete') {
    const { error } = await supabase
      .from('project_knowledge')
      .update({ action_required: false })
      .eq('id', entityId)

    if (error) return { toast: 'Failed to complete' }

    return {
      toast: 'Marked complete',
      editMessage: '(Action marked as complete)',
    }
  }

  if (action === 'defer') {
    const days = parseInt(extra || '7', 10)
    const newDate = new Date()
    newDate.setDate(newDate.getDate() + days)

    const { error } = await supabase
      .from('project_knowledge')
      .update({ follow_up_date: newDate.toISOString().split('T')[0] })
      .eq('id', entityId)

    if (error) return { toast: 'Failed to defer' }

    return {
      toast: `Deferred ${days}d`,
      editMessage: `(Action deferred to ${newDate.toISOString().split('T')[0]})`,
    }
  }

  return { toast: `Unknown action: ${action}` }
}

async function handleContactCallback(
  action: string,
  entityId: string,
  chatId: number
): Promise<CallbackResult> {
  if (action === 'ack') {
    return {
      toast: 'Acknowledged',
      editMessage: '(Engagement drop acknowledged)',
    }
  }

  if (action === 'email') {
    // Look up contact details and prompt the agent to draft an email
    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('full_name, email')
      .eq('ghl_id', entityId)
      .maybeSingle()

    if (!contact?.email) {
      return { toast: 'No email on file', reply: 'This contact has no email address on file.' }
    }

    // Send to agent to draft a check-in email
    const result = await processAgentMessage(
      chatId,
      `Draft a brief check-in email to ${contact.full_name} at ${contact.email}. Keep it warm and casual, ask how they're going and if there's anything we can help with.`
    )

    return {
      toast: 'Drafting email',
      reply: result.text,
    }
  }

  return { toast: `Unknown contact action: ${action}` }
}

async function handleXeroCallback(action: string, entityId: string): Promise<CallbackResult> {
  if (action === 'invoice') {
    const { data: invoice } = await supabase
      .from('xero_invoices')
      .select('invoice_number, contact_name, total, status, due_date')
      .eq('xero_id', entityId)
      .maybeSingle()

    if (!invoice) return { toast: 'Invoice not found' }

    return {
      toast: 'Loaded invoice',
      reply: `Invoice ${invoice.invoice_number}\nContact: ${invoice.contact_name}\nTotal: $${Number(invoice.total).toLocaleString('en-AU', { minimumFractionDigits: 2 })}\nStatus: ${invoice.status}\nDue: ${invoice.due_date || 'N/A'}`,
    }
  }

  return { toast: `Unknown Xero action: ${action}` }
}

async function handleGmailCallback(action: string, entityId: string): Promise<CallbackResult> {
  if (action === 'open') {
    return {
      toast: 'Gmail link',
      reply: `Open Gmail for ${entityId}:\nhttps://mail.google.com/mail/u/?authuser=${entityId}`,
    }
  }

  return { toast: `Unknown Gmail action: ${action}` }
}
