/**
 * Project Linker: AI-powered communication → project classification
 *
 * Maps communications to ACT project codes with confidence scores.
 * Uses gpt-4o-mini via trackedCompletion for cost efficiency.
 *
 * Usage:
 *   import { classifyBatch } from './lib/project-linker.mjs';
 *   const results = await classifyBatch(emails);
 */

import { trackedCompletion } from './llm-client.mjs';
import { loadProjects } from './project-loader.mjs';

// Dynamically loaded from Supabase projects table (cached 5 min)
let PROJECT_CODES = null;

async function getProjectCodes() {
  if (PROJECT_CODES) return PROJECT_CODES;
  const projects = await loadProjects();
  PROJECT_CODES = {};
  for (const [code, proj] of Object.entries(projects)) {
    PROJECT_CODES[code] = `${proj.name} - ${proj.description || ''}`;
  }
  return PROJECT_CODES;
}

async function buildSystemPrompt() {
  const codes = await getProjectCodes();
  const codeList = Object.entries(codes)
    .map(([code, desc]) => `  ${code}: ${desc}`)
    .join('\n');

  return `You are an AI classifier for ACT (A Curious Tractor), a social enterprise ecosystem.
Given a batch of emails, classify each one to the most relevant ACT project code(s).

Available project codes:
${codeList}

Rules:
- Return JSON array with one object per email (same order as input)
- Each object: { "codes": ["CODE1", "CODE2"], "confidence": 0.0-1.0, "reasoning": "brief reason" }
- Use empty codes array [] if no project match (confidence 0)
- Max 2 codes per email
- Confidence: 0.9+ = very clear match, 0.7-0.9 = likely, 0.5-0.7 = possible, <0.5 = skip
- Return ONLY valid JSON array, no markdown`;
}

/**
 * Classify a batch of emails to project codes
 *
 * @param {Array} emails - Array of { id, subject, content_preview, from, direction }
 * @param {object} options - { confidenceThreshold }
 * @returns {Array} Array of { id, codes, confidence, reasoning }
 */
export async function classifyBatch(emails, options = {}) {
  if (!emails || emails.length === 0) return [];

  const threshold = options.confidenceThreshold || 0.7;
  const systemPrompt = await buildSystemPrompt();
  const codes = await getProjectCodes();

  // Format emails for the prompt
  const emailList = emails.map((e, i) => {
    const from = e.metadata?.from || e.from || '';
    return `[${i}] Direction: ${e.direction || 'unknown'} | From: ${from} | Subject: ${e.subject || '(no subject)'}\n    Preview: ${(e.content_preview || '').substring(0, 200)}`;
  }).join('\n\n');

  const userMessage = `Classify these ${emails.length} emails:\n\n${emailList}`;

  try {
    const raw = await trackedCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      'enrich-communications',
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: emails.length * 80 + 100,
        operation: 'project_classify',
      }
    );

    const parsed = JSON.parse(raw.trim());

    if (!Array.isArray(parsed)) {
      console.warn('[ProjectLinker] Response is not an array');
      return emails.map(e => ({ id: e.id, codes: [], confidence: 0, reasoning: 'parse error' }));
    }

    // Map results back to email IDs
    return emails.map((email, i) => {
      const result = parsed[i] || { codes: [], confidence: 0, reasoning: 'missing' };
      return {
        id: email.id,
        codes: (result.codes || []).filter(c => codes[c]),
        confidence: Math.min(result.confidence || 0, 1.0),
        reasoning: result.reasoning || '',
        aboveThreshold: (result.confidence || 0) >= threshold,
      };
    });
  } catch (err) {
    console.error('[ProjectLinker] Classification failed:', err.message);
    return emails.map(e => ({ id: e.id, codes: [], confidence: 0, reasoning: 'error: ' + err.message }));
  }
}

/**
 * Save project links to database
 *
 * @param {object} supabase - Supabase client
 * @param {Array} classifications - Output from classifyBatch
 * @param {number} threshold - Minimum confidence to save
 */
export async function saveProjectLinks(supabase, classifications, threshold = 0.7) {
  const links = [];
  const updates = [];

  for (const item of classifications) {
    if (item.confidence < threshold || item.codes.length === 0) continue;

    for (const code of item.codes) {
      links.push({
        communication_id: item.id,
        project_code: code,
        confidence: item.confidence,
        reasoning: item.reasoning,
      });
    }

    updates.push({
      id: item.id,
      project_codes: item.codes,
      ai_project_confidence: item.confidence,
    });
  }

  // Insert links
  if (links.length > 0) {
    const { error: linkError } = await supabase
      .from('communication_project_links')
      .upsert(links, { onConflict: 'communication_id,project_code', ignoreDuplicates: true });

    if (linkError) {
      console.error('[ProjectLinker] Failed to save links:', linkError.message);
    }
  }

  // Update communications_history
  for (const update of updates) {
    await supabase
      .from('communications_history')
      .update({
        project_codes: update.project_codes,
        ai_project_confidence: update.ai_project_confidence,
      })
      .eq('id', update.id);
  }

  return { saved: links.length, updated: updates.length };
}

export { getProjectCodes };
export default { classifyBatch, saveProjectLinks, getProjectCodes };
