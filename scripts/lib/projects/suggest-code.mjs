/**
 * AI-suggest a project_code (ACT-XX) for a newly-starting idea.
 *
 * Plan: ~/.claude/plans/coo-cio-cfo-money-brain-phase2.md § B3.
 *
 * Pattern:
 *   import { suggestProjectCode, confirmProjectCode } from './lib/projects/suggest-code.mjs'
 *   const suggestion = await suggestProjectCode({ ideaText, ideaId })
 *   // present `suggestion` to user, get confirm or override
 *   await confirmProjectCode({ ideaId, code: confirmed, name, organizationId })
 *
 * Anthropic Haiku is used because naming is a cheap 2-letter pick. The model
 * sees existing project codes so it doesn't collide.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { trackedAgentCompletionWithFallback } from '../llm-client.mjs';

const ACT_ORG_ID = '88f84b66-f0fd-4fcf-9ec9-3cfc682303c5';
const SCRIPT_NAME = 'projects/suggest-code';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function loadExistingCodes() {
  const { data, error } = await supabase
    .from('projects')
    .select('code, name, status')
    .order('code')
    .limit(500);
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return data ?? [];
}

/**
 * @param {{ ideaText: string, ideaId?: string, hint?: string }} input
 * @returns {Promise<{ code: string, name: string, rationale: string, conflicts: string[] }>}
 */
export async function suggestProjectCode({ ideaText, hint }) {
  if (!ideaText || ideaText.trim().length === 0) {
    throw new Error('ideaText required');
  }
  const existing = await loadExistingCodes();
  const codeList = existing.map((p) => `${p.code} (${p.name})`).join('\n');

  const prompt = `You name new ACT (A Curious Tractor) projects. Convention: ACT-XX where XX is 2-3 uppercase letters that abbreviate the project name memorably.

Existing project codes (avoid collision):
${codeList}

Pick a new code for this idea:
"""
${ideaText}
"""${hint ? `\n\nHint from user: ${hint}` : ''}

Return JSON only:
{
  "code": "ACT-XX",
  "name": "Short Project Name (3-5 words, title case)",
  "rationale": "1-line why this code"
}

Rules:
- Code must start with "ACT-"
- 2-3 letters after the dash
- Don't reuse any existing code above
- Name should be the actual thing the idea is, not a marketing slogan`;

  const text = await trackedAgentCompletionWithFallback(prompt, SCRIPT_NAME, {
    task: 'classify', // cheap-tier: naming is a shallow pick
    maxTokens: 600, // MiniMax needs headroom for stripped <think> blocks
    operation: 'suggest-project-code',
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse JSON from model response: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);

  if (!/^ACT-[A-Z]{2,4}$/.test(parsed.code)) {
    throw new Error(`Model returned invalid code format: ${parsed.code}`);
  }

  const conflicts = existing.filter((p) => p.code === parsed.code).map((p) => `${p.code} (${p.name})`);
  if (conflicts.length > 0) {
    // Model collided despite the list — fall back to a numeric suffix
    let suffix = 2;
    while (existing.some((p) => p.code === `${parsed.code}${suffix}`)) suffix += 1;
    parsed.code = `${parsed.code}${suffix}`;
  }

  return {
    code: parsed.code,
    name: parsed.name,
    rationale: parsed.rationale ?? '',
    conflicts,
  };
}

/**
 * Apply a confirmed code: INSERT projects + UPDATE idea_board.project_code.
 *
 * @param {{ ideaId: string, code: string, name: string, organizationId?: string }} input
 * @returns {Promise<{ projectId: string, code: string, name: string }>}
 */
export async function confirmProjectCode({ ideaId, code, name, organizationId }) {
  if (!ideaId) throw new Error('ideaId required');
  if (!/^ACT-[A-Z0-9]{2,5}$/.test(code)) throw new Error(`Invalid code format: ${code}`);
  if (!name) throw new Error('name required');

  const orgId = organizationId ?? ACT_ORG_ID;

  // Check for existing project with this code first (race protection)
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, code')
    .eq('code', code)
    .maybeSingle();

  let projectId;
  if (existingProject) {
    projectId = existingProject.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('projects')
      .insert({
        code,
        name,
        tier: 'satellite',
        status: 'active',
        organization_id: orgId,
      })
      .select('id, code, name')
      .single();
    if (insertErr) throw new Error(`Failed to insert project: ${insertErr.message}`);
    projectId = inserted.id;
  }

  const { error: updateErr } = await supabase
    .from('idea_board')
    .update({ project_code: code, updated_at: new Date().toISOString() })
    .eq('id', ideaId);
  if (updateErr) throw new Error(`Failed to link idea: ${updateErr.message}`);

  return { projectId, code, name };
}

// CLI entry point: node scripts/lib/projects/suggest-code.mjs --idea-id <uuid>
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const ideaIdIdx = args.indexOf('--idea-id');
  const ideaId = ideaIdIdx >= 0 ? args[ideaIdIdx + 1] : null;
  const confirmIdx = args.indexOf('--confirm');
  const confirmCode = confirmIdx >= 0 ? args[confirmIdx + 1] : null;
  const hintIdx = args.indexOf('--hint');
  const hint = hintIdx >= 0 ? args[hintIdx + 1] : null;

  if (!ideaId) {
    console.error('Usage: node scripts/lib/projects/suggest-code.mjs --idea-id <uuid> [--hint "..."] [--confirm ACT-XX]');
    process.exit(1);
  }

  const { data: idea, error } = await supabase
    .from('idea_board')
    .select('id, text, lifecycle_stage')
    .eq('id', ideaId)
    .single();
  if (error || !idea) {
    console.error(`Idea not found: ${error?.message ?? 'no row'}`);
    process.exit(1);
  }

  if (confirmCode) {
    // Re-run suggestion to grab name (or could pass --name)
    const suggestion = await suggestProjectCode({ ideaText: idea.text, hint });
    const finalName = suggestion.code === confirmCode ? suggestion.name : idea.text.slice(0, 60);
    const result = await confirmProjectCode({ ideaId, code: confirmCode, name: finalName });
    console.log(JSON.stringify({ confirmed: true, ...result }, null, 2));
  } else {
    const suggestion = await suggestProjectCode({ ideaText: idea.text, hint });
    console.log(JSON.stringify({ suggestion, idea: { id: idea.id, text: idea.text } }, null, 2));
    console.log('\nTo apply: re-run with --confirm ' + suggestion.code);
  }
}
