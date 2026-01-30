#!/usr/bin/env node
/**
 * ClawdBot Notification Client
 *
 * Sends notifications to ClawdBot for all platform events
 */

const CLAUDBOT_WEBHOOK_URL = process.env.CLAUDE_BOT_WEBHOOK_URL;
const CLAUDBOT_ENABLED = process.env.CLAUDE_BOT_NOTIFICATIONS_ENABLED === 'true';

export class ClawdBotClient {
  constructor() {
    this.webhookUrl = CLAUDBOT_WEBHOOK_URL;
    this.enabled = CLAUDBOT_ENABLED;
  }

  async notify(event, data, priority = 'normal') {
    if (!this.enabled) {
      console.log(`[ClawdBot] ${priority.toUpperCase()} ${event}:`, data);
      return { sent: false, reason: 'disabled' };
    }

    if (!this.webhookUrl) {
      console.log(`[ClawdBot] ${priority.toUpperCase()} ${event}:`, data);
      return { sent: false, reason: 'no_webhook' };
    }

    const payload = {
      source: 'ACT-Intelligence-Platform',
      event,
      priority,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return { sent: true, status: response.status };
    } catch (e) {
      console.error('[ClawdBot] Error:', e.message);
      return { sent: false, error: e.message };
    }
  }

  // Convenience methods for common events
  async notifyDeadline(data) {
    return this.notify('deadline_approaching', data, 'high');
  }

  async notifyInvoiceOverdue(data) {
    return this.notify('invoice_overdue', data, 'high');
  }

  async notifyGoalCompleted(data) {
    return this.notify('goal_completed', data, 'normal');
  }

  async notifyUrgentEmail(data) {
    return this.notify('communication_urgent', data, 'high');
  }

  async notifyAgentApproval(data) {
    return this.notify('agent_approval', data, 'normal');
  }

  async notifySystemAlert(data) {
    return this.notify('system_alert', data, 'high');
  }
}

export default ClawdBotClient;
