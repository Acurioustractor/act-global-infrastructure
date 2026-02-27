/**
 * Event Reactor Types
 */

/** Row from integration_events table */
export interface IntegrationEventRow {
  id: string;
  source: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload?: Record<string, unknown>;
  latency_ms?: number;
  error?: string;
  processed_at?: string;
  created_at?: string;
}

/** Telegram inline keyboard action */
export interface TelegramAction {
  label: string;
  /** Callback data sent back when button is tapped */
  callback: string;
}

/** A reaction to be sent (typically a Telegram notification) */
export interface Reaction {
  message: string;
  actions?: TelegramAction[];
  ruleName: string;
  priority: number;
}

/** A rule that evaluates events and optionally produces reactions */
export interface ReactionRule {
  /** Unique rule name */
  name: string;
  /** Lower number = higher priority */
  priority: number;
  /** Cooldown in minutes before this rule can fire again for the same entity */
  cooldownMinutes?: number;
  /** Extract a unique key for rate limiting */
  entityKey?: (event: IntegrationEventRow) => string;
  /** Return true if this rule matches the event */
  match: (event: IntegrationEventRow) => Promise<boolean> | boolean;
  /** Generate a reaction. Return null to skip despite matching. */
  react: (event: IntegrationEventRow) => Promise<Omit<Reaction, 'ruleName' | 'priority'> | null>;
}
