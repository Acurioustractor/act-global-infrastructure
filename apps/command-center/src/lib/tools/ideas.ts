/**
 * Pilot lifecycle tools — Pass 2B
 *
 * Plan: ~/.claude/plans/coo-cio-cfo-money-brain-phase2.md (Q2-Q7)
 *
 * Stages: idea → scope → fundraise → start (or killed terminal)
 * Owner: defaults to 'ben' (Q4)
 * Snooze cap: 3 before forced decision (Q6)
 */

import { supabase } from '../supabase'

type LifecycleStage = 'idea' | 'scope' | 'fundraise' | 'start' | 'killed'

const VALID_STAGES: LifecycleStage[] = ['idea', 'scope', 'fundraise', 'start', 'killed']

/** Valid forward transitions. Backwards moves require explicit override. */
const ALLOWED_FORWARD: Record<LifecycleStage, LifecycleStage[]> = {
  idea: ['scope', 'killed'],
  scope: ['fundraise', 'killed'],
  fundraise: ['start', 'killed'],
  start: ['killed'],
  killed: [], // terminal
}

export async function executeAddIdea(input: {
  text: string
  category?: string
  energy?: number
  value_estimate?: number
  owner?: string
}): Promise<string> {
  try {
    if (!input.text || input.text.trim().length === 0) {
      return JSON.stringify({ error: 'Idea text required' })
    }

    const { data, error } = await supabase
      .from('idea_board')
      .insert({
        text: input.text.trim(),
        category: input.category ?? 'idea',
        energy: input.energy ?? 0,
        value_estimate: input.value_estimate ?? 0,
        lifecycle_stage: 'idea',
        owner: input.owner ?? 'ben',
        status: 'open',
      })
      .select('id, text, lifecycle_stage, owner')
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'idea_added',
      id: data.id,
      text: data.text,
      stage: data.lifecycle_stage,
      owner: data.owner,
      confirmation: `Captured idea (${data.lifecycle_stage}, owner ${data.owner}). I'll nudge you in 90 days if it stays idle.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

export async function executeTransitionIdeaStage(input: {
  id: string
  stage: LifecycleStage
  kill_reason?: string
  force?: boolean
}): Promise<string> {
  try {
    if (!VALID_STAGES.includes(input.stage)) {
      return JSON.stringify({ error: `Invalid stage: ${input.stage}. Must be one of: ${VALID_STAGES.join(', ')}` })
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('idea_board')
      .select('id, text, lifecycle_stage, project_code')
      .eq('id', input.id)
      .single()

    if (fetchErr || !existing) {
      return JSON.stringify({ error: fetchErr?.message ?? 'Idea not found' })
    }

    const current = existing.lifecycle_stage as LifecycleStage
    const allowed = ALLOWED_FORWARD[current]
    if (!input.force && !allowed.includes(input.stage)) {
      return JSON.stringify({
        error: `Invalid transition ${current} → ${input.stage}. Allowed: ${allowed.join(', ') || '(none — terminal)'}`,
      })
    }

    if (input.stage === 'killed' && !input.kill_reason) {
      // optional but encouraged (plan Q decision: optional)
    }

    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      lifecycle_stage: input.stage,
      stage_entered_at: nowIso,
      updated_at: nowIso,
    }
    if (input.stage === 'killed' && input.kill_reason) {
      updatePayload.kill_reason = input.kill_reason
    }

    const { error: updateErr } = await supabase
      .from('idea_board')
      .update(updatePayload)
      .eq('id', input.id)

    if (updateErr) return JSON.stringify({ error: updateErr.message })

    const needsProjectCode = input.stage === 'start' && !existing.project_code

    return JSON.stringify({
      action: 'idea_transitioned',
      id: existing.id,
      from: current,
      to: input.stage,
      text: existing.text,
      needs_project_code: needsProjectCode,
      confirmation:
        input.stage === 'start' && needsProjectCode
          ? `Moved to start. I'll suggest a project_code next — run scripts/lib/projects/suggest-code.mjs to bridge into projects.`
          : input.stage === 'killed'
            ? `Killed. ${input.kill_reason ? `Reason captured: "${input.kill_reason}".` : 'No reason given.'}`
            : `Stage updated to ${input.stage}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

export async function executeSnoozeIdea(input: {
  id: string
  days: number
  by_owner?: string
}): Promise<string> {
  try {
    if (!input.days || input.days < 1 || input.days > 90) {
      return JSON.stringify({ error: 'days must be 1-90' })
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('idea_board')
      .select('id, text, lifecycle_stage')
      .eq('id', input.id)
      .single()

    if (fetchErr || !existing) {
      return JSON.stringify({ error: fetchErr?.message ?? 'Idea not found' })
    }

    // Snooze cap (Q6 — 3 max before forced decision)
    const { count: snoozeCount } = await supabase
      .from('idea_snoozes')
      .select('id', { count: 'exact', head: true })
      .eq('idea_id', input.id)

    if ((snoozeCount ?? 0) >= 3) {
      return JSON.stringify({
        error: 'snooze_limit_reached',
        snooze_count: snoozeCount,
        message: `This idea has been snoozed ${snoozeCount} times already. Make a call: → fundraise, → start, or ❌ kill.`,
      })
    }

    const until = new Date()
    until.setUTCDate(until.getUTCDate() + input.days)
    const snoozedUntil = until.toISOString().slice(0, 10) // YYYY-MM-DD

    const { error: insertErr } = await supabase.from('idea_snoozes').insert({
      idea_id: input.id,
      snoozed_until: snoozedUntil,
      by_owner: input.by_owner ?? 'ben',
    })

    if (insertErr) return JSON.stringify({ error: insertErr.message })

    return JSON.stringify({
      action: 'idea_snoozed',
      id: existing.id,
      snoozed_until: snoozedUntil,
      snooze_count: (snoozeCount ?? 0) + 1,
      remaining: 3 - ((snoozeCount ?? 0) + 1),
      confirmation: `Snoozed until ${snoozedUntil} (${3 - ((snoozeCount ?? 0) + 1)} snoozes remaining before forced decision).`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

/**
 * Build the standard 4-button inline keyboard for a reminder DM.
 * Callback format: `idea:<action>:<id>[:<extra>]` — handled in reactor-callbacks.ts.
 */
export function buildIdeaReminderKeyboard(ideaId: string, currentStage: LifecycleStage) {
  const rows: Array<Array<{ text: string; callback_data: string }>> = []

  // Stage-progression row (omit options that aren't valid forward moves)
  const progressionButtons: Array<{ text: string; callback_data: string }> = []
  if (ALLOWED_FORWARD[currentStage].includes('fundraise')) {
    progressionButtons.push({ text: '→ fundraise', callback_data: `idea:to_fundraise:${ideaId}` })
  }
  if (ALLOWED_FORWARD[currentStage].includes('start')) {
    progressionButtons.push({ text: '→ start', callback_data: `idea:to_start:${ideaId}` })
  }
  if (progressionButtons.length > 0) rows.push(progressionButtons)

  // Decision row (kill + snooze always available unless terminal)
  if (currentStage !== 'killed') {
    rows.push([
      { text: '❌ kill', callback_data: `idea:kill:${ideaId}` },
      { text: '💤 snooze 14d', callback_data: `idea:snooze:${ideaId}:14` },
    ])
  }

  return { inline_keyboard: rows }
}
