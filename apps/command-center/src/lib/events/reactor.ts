/**
 * Event Reaction Engine
 *
 * Evaluates integration events against a set of rules and produces
 * reactions (typically Telegram notifications with action buttons).
 *
 * Rules are evaluated in priority order. The highest-priority matching
 * rule wins. Rate limiting prevents notification spam.
 */

import { supabase } from '@/lib/supabase';
import type { ReactionRule, Reaction, IntegrationEventRow } from './types';
import { rules } from './rules';

/**
 * Evaluate an integration event against all reaction rules.
 * Returns the highest-priority matching reaction, or null.
 */
export async function evaluateEvent(event: IntegrationEventRow): Promise<Reaction | null> {
  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    try {
      const matches = await rule.match(event);
      if (!matches) continue;

      // Check rate limit
      const entityKey = rule.entityKey?.(event) || event.entity_id || 'default';
      const isRateLimited = await checkRateLimit(rule.name, entityKey, rule.cooldownMinutes || 60);
      if (isRateLimited) {
        console.log(`[Reactor] Rate limited: ${rule.name} for ${entityKey}`);
        continue;
      }

      // Generate reaction
      const reaction = await rule.react(event);
      if (!reaction) continue;

      // Record rate limit hit
      await recordRateLimit(rule.name, entityKey);

      return {
        ...reaction,
        ruleName: rule.name,
        priority: rule.priority,
      };
    } catch (err) {
      console.error(`[Reactor] Error evaluating rule ${rule.name}:`, (err as Error).message);
    }
  }

  return null;
}

/**
 * Check if a rule+entity combination is rate limited.
 *
 * notification_rate_limits table removed from DB — returns false (never
 * rate-limited) until a backend exists, so reactions are always allowed.
 */
async function checkRateLimit(
  _ruleName: string,
  _entityKey: string,
  _cooldownMinutes: number
): Promise<boolean> {
  return false;
}

/**
 * Record a rate limit entry.
 *
 * notification_rate_limits table removed from DB — no-op until a backend exists.
 */
async function recordRateLimit(_ruleName: string, _entityKey: string): Promise<void> {
  // intentionally empty
}

/**
 * Record a reaction in the event_reactions table.
 */
export async function recordReaction(
  eventId: string,
  reaction: Reaction
): Promise<void> {
  await supabase.from('event_reactions').insert({
    event_id: eventId,
    rule_name: reaction.ruleName,
    reaction_type: 'telegram_notification',
    priority: reaction.priority,
    message: reaction.message,
    actions: reaction.actions || null,
  });
}
