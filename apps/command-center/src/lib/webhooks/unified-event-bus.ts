/**
 * Unified Event Bus
 *
 * Enhanced event bus that enables cross-service workflows.
 * Extends the existing event-bus.ts with subscription patterns
 * and event routing between GHL, Gmail, Xero, Telegram, and internal systems.
 *
 * Usage:
 *   import { UnifiedEventBus } from '@/lib/webhooks/unified-event-bus'
 *
 *   const bus = new UnifiedEventBus(supabase)
 *
 *   // Subscribe to events
 *   bus.on('xero.invoice.paid', async (event) => {
 *     await bus.emit('ghl.opportunity.update', { ... })
 *     await bus.notify('telegram', `Invoice ${event.entityId} paid`)
 *   })
 *
 *   // Emit events
 *   await bus.emit('ghl.contact.created', { contactId: '123', ... })
 */

import type { IntegrationEvent, WebhookEvent, WebhookResult } from './types'

type SupabaseClient = {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
      }
    }
    update: (data: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
    }
  }
}

export type EventHandler = (event: IntegrationEvent) => Promise<void>

export type EventPattern = string // e.g. 'xero.*', 'ghl.contact.*', 'xero.invoice.paid'

interface Subscription {
  pattern: EventPattern
  handler: EventHandler
  label: string
}

export class UnifiedEventBus {
  private supabase: SupabaseClient
  private subscriptions: Subscription[] = []
  private eventLog: Array<{ event: string; timestamp: number; success: boolean }> = []

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Subscribe to events matching a pattern.
   *
   * Patterns support wildcards:
   * - 'xero.invoice.paid' - exact match
   * - 'xero.invoice.*' - matches all invoice events
   * - 'xero.*' - matches all xero events
   * - '*' - matches everything
   */
  on(pattern: EventPattern, handler: EventHandler, label?: string): () => void {
    const subscription: Subscription = {
      pattern,
      handler,
      label: label || pattern,
    }
    this.subscriptions.push(subscription)

    // Return unsubscribe function
    return () => {
      const idx = this.subscriptions.indexOf(subscription)
      if (idx >= 0) this.subscriptions.splice(idx, 1)
    }
  }

  /**
   * Emit an event to all matching subscribers and log to database.
   */
  async emit(eventType: string, payload: Record<string, unknown> = {}): Promise<WebhookResult[]> {
    const event: IntegrationEvent = {
      source: eventType.split('.')[0],
      event_type: eventType,
      entity_type: eventType.split('.')[1] || 'unknown',
      entity_id: (payload.entityId as string) || (payload.id as string) || 'unknown',
      payload,
      processed_at: new Date().toISOString(),
    }

    // Log to database
    try {
      await this.supabase
        .from('integration_events')
        .insert({
          source: event.source,
          event_type: event.event_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          payload: event.payload,
          processed_at: event.processed_at,
        })
        .select()
        .single()
    } catch (err) {
      console.error('[EventBus] Failed to log event:', (err as Error).message)
    }

    // Find matching handlers
    const matching = this.subscriptions.filter(sub => this.matchPattern(sub.pattern, eventType))
    const results: WebhookResult[] = []

    for (const sub of matching) {
      const start = Date.now()
      try {
        await sub.handler(event)
        results.push({
          success: true,
          action: sub.label,
          latencyMs: Date.now() - start,
        })
        this.eventLog.push({ event: eventType, timestamp: Date.now(), success: true })
      } catch (err) {
        results.push({
          success: false,
          action: sub.label,
          error: (err as Error).message,
          latencyMs: Date.now() - start,
        })
        this.eventLog.push({ event: eventType, timestamp: Date.now(), success: false })
        console.error(`[EventBus] Handler "${sub.label}" failed for ${eventType}:`, (err as Error).message)
      }
    }

    return results
  }

  /**
   * Match an event type against a subscription pattern.
   */
  private matchPattern(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true

    const patternParts = pattern.split('.')
    const eventParts = eventType.split('.')

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') return true
      if (patternParts[i] !== eventParts[i]) return false
    }

    return patternParts.length === eventParts.length
  }

  /**
   * Get registered subscription patterns.
   */
  getSubscriptions(): Array<{ pattern: string; label: string }> {
    return this.subscriptions.map(s => ({
      pattern: s.pattern,
      label: s.label,
    }))
  }

  /**
   * Get recent event log (in-memory, for debugging).
   */
  getRecentEvents(limit = 100): typeof this.eventLog {
    return this.eventLog.slice(-limit)
  }

  /**
   * Get event stats from the in-memory log.
   */
  getStats(): { total: number; success: number; failed: number; subscriptions: number } {
    return {
      total: this.eventLog.length,
      success: this.eventLog.filter(e => e.success).length,
      failed: this.eventLog.filter(e => !e.success).length,
      subscriptions: this.subscriptions.length,
    }
  }
}
