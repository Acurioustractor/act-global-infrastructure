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
 */
async function checkRateLimit(
  ruleName: string,
  entityKey: string,
  cooldownMinutes: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('notification_rate_limits')
    .select('last_notified_at')
    .eq('rule_name', ruleName)
    .eq('entity_key', entityKey)
    .gte('last_notified_at', cutoff)
    .maybeSingle();

  return !!data;
}

/**
 * Record a rate limit entry.
 */
async function recordRateLimit(ruleName: string, entityKey: string): Promise<void> {
  await supabase.from('notification_rate_limits').upsert(
    {
      rule_name: ruleName,
      entity_key: entityKey,
      last_notified_at: new Date().toISOString(),
      count_today: 1,
    },
    { onConflict: 'rule_name,entity_key' }
  );
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
