/**
 * Grant Draft Generator: RAG-powered application section writing
 *
 * Given a grant opportunity + project, retrieves relevant knowledge
 * and generates draft application sections using Claude Sonnet.
 *
 * Usage:
 *   import { generateDraft } from './lib/grant-draft-generator.mjs';
 *   const drafts = await generateDraft(grant, project, knowledgeItems, ['executive_summary']);
 */

import { trackedClaudeCompletion } from './llm-client.mjs';

const SCRIPT_NAME = 'grant-draft-generator';

const SECTION_TEMPLATES = {
  executive_summary: {
    label: 'Executive Summary',
    words: 200,
    description: 'High-level overview of the project and how it aligns with the grant',
  },
  project_description: {
    label: 'Project Description',
    words: 500,
    description: 'What we will do, how it connects to our existing work, methodology',
  },
  budget_justification: {
    label: 'Budget Justification',
    words: 300,
    description: 'Why the funding is needed and how it will be allocated',
  },
  impact_statement: {
    label: 'Impact Statement',
    words: 300,
    description: 'Expected outcomes, how they will be measured, long-term impact',
  },
  team_expertise: {
    label: 'Team & Expertise',
    words: 200,
    description: 'Who is involved, their track record, organizational capacity',
  },
};

/**
 * Generate draft sections for a grant application
 *
 * @param {object} grant - Grant opportunity details
 * @param {object} project - Project details (name, description, leads, etc)
 * @param {Array} knowledgeItems - RAG-retrieved knowledge items
 * @param {string[]} sections - Section keys to generate
 * @returns {Record<string, string>} Drafted sections
 */
export async function generateDraft(grant, project, knowledgeItems, sections) {
  const drafts = {};

  // Build context from knowledge items
  const knowledgeContext = knowledgeItems
    .slice(0, 10)
    .map((k, i) => `[${i + 1}] ${k.title}: ${(k.content || k.summary || '').slice(0, 500)}`)
    .join('\n\n');

  const grantContext = [
    `Grant: ${grant.name}`,
    `Provider: ${grant.provider}`,
    grant.program ? `Program: ${grant.program}` : '',
    grant.amount_min || grant.amount_max
      ? `Amount: $${(grant.amount_min || '?').toLocaleString()} - $${(grant.amount_max || '?').toLocaleString()}`
      : '',
    grant.fit_notes ? `Fit notes: ${grant.fit_notes}` : '',
    grant.categories ? `Categories: ${grant.categories.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const projectContext = [
    `Project: ${project.name} (${project.code})`,
    project.description ? `Description: ${project.description}` : '',
    project.category ? `Category: ${project.category}` : '',
    project.lead ? `Lead: ${project.lead}` : '',
  ].filter(Boolean).join('\n');

  for (const sectionKey of sections) {
    const template = SECTION_TEMPLATES[sectionKey];
    if (!template) {
      drafts[sectionKey] = `Unknown section: ${sectionKey}`;
      continue;
    }

    const prompt = `You are a grant writer for ACT (Australian Community Trust), a social enterprise ecosystem based in Queensland, Australia. ACT operates across justice, indigenous, arts, enterprise, regenerative, and community sectors.

Write the "${template.label}" section for this grant application.

GRANT DETAILS:
${grantContext}

PROJECT DETAILS:
${projectContext}

RELEVANT KNOWLEDGE FROM OUR WORK:
${knowledgeContext || 'No specific knowledge available — use general project information.'}

REQUIREMENTS:
- Section: ${template.label}
- Purpose: ${template.description}
- Target length: ~${template.words} words
- Tone: Professional but passionate, grounded in real work
- Reference specific knowledge items where relevant
- Use Australian English spelling
- Do NOT use placeholder brackets like [insert name] — write complete prose
- If knowledge is sparse, focus on the project description and mission alignment

Write ONLY the section content (no heading, no markdown formatting).`;

    try {
      const text = await trackedClaudeCompletion(prompt, SCRIPT_NAME, {
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: template.words * 3, // Allow some headroom
        operation: `draft-${sectionKey}`,
        temperature: 0.7,
      });

      drafts[sectionKey] = text.trim();
    } catch (err) {
      console.error(`Error generating ${sectionKey}:`, err.message);
      drafts[sectionKey] = `Error generating this section: ${err.message}`;
    }
  }

  return drafts;
}

/**
 * Get available section templates
 */
export function getSectionTemplates() {
  return SECTION_TEMPLATES;
}

export default { generateDraft, getSectionTemplates };
