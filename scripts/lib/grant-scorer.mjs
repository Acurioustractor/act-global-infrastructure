/**
 * Grant Scorer: AI-powered grant-project fit assessment
 *
 * Scores each discovered grant against all 26 ACT projects using
 * Claude Haiku for cost efficiency (~$0.20/day for 20 grants).
 *
 * Usage:
 *   import { scoreGrantBatch } from './lib/grant-scorer.mjs';
 *   const scored = await scoreGrantBatch(grants, projects);
 */

import { trackedClaudeCompletion } from './llm-client.mjs';

const SCRIPT_NAME = 'grant-scorer';
const BATCH_SIZE = 5; // Grants per LLM call

/**
 * Score a batch of grants against all projects
 *
 * @param {Array} grants - Normalized grant objects from grant-sources
 * @param {Record<string, object>} projects - Projects keyed by code from project-loader
 * @returns {Array<{ grant, alignedProjects, fitScore, eligibilityScore, categories }>}
 */
export async function scoreGrantBatch(grants, projects) {
  const results = [];

  // Build compact project summary for the prompt
  const projectSummary = Object.entries(projects)
    .map(([code, p]) => `${code}: ${p.name} — ${p.description || 'No description'}. Category: ${p.category || 'general'}`)
    .join('\n');

  // Process in batches
  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);
    console.log(`  Scoring grants ${i + 1}-${i + batch.length} of ${grants.length}...`);

    const grantDescriptions = batch.map((g, idx) => {
      const amount = g.amountMin && g.amountMax
        ? `$${g.amountMin.toLocaleString()}-$${g.amountMax.toLocaleString()}`
        : g.amountMax ? `Up to $${g.amountMax.toLocaleString()}`
        : g.amountMin ? `From $${g.amountMin.toLocaleString()}`
        : 'Amount not specified';

      return `GRANT ${idx + 1}: "${g.name}" by ${g.provider}
  ${g.description || 'No description available'}
  Amount: ${amount}
  Deadline: ${g.closesAt || 'Unknown'}
  Categories: ${(g.categories || []).join(', ') || 'Unspecified'}`;
    }).join('\n\n');

    const prompt = `You are a grant assessment specialist for ACT (Australian Community Trust), a social enterprise ecosystem in Queensland.

Score each grant below against our projects. For each grant, identify the top 3 most aligned projects and score overall fit.

PROJECTS:
${projectSummary}

GRANTS TO SCORE:
${grantDescriptions}

For each grant, return JSON. Return ONLY a JSON array (no markdown):
[{
  "grantIndex": 0,
  "fitScore": 75,
  "eligibilityScore": 80,
  "alignedProjects": ["ACT-JH", "ACT-PICC"],
  "categories": ["justice", "indigenous"],
  "fitNotes": "Strong alignment with JusticeHub youth diversion work"
}]

Scoring guide:
- fitScore (0-100): How well the grant aligns with ACT's mission and projects
  - 80-100: Perfect match, should definitely apply
  - 60-79: Good fit, worth investigating
  - 40-59: Partial fit, secondary priority
  - 0-39: Weak fit
- eligibilityScore (0-100): How likely ACT meets eligibility criteria
  - Consider: NFP status, location (QLD), First Nations focus, track record
- alignedProjects: Top 1-3 project codes that best match
- categories: Grant focus areas from [justice, indigenous, stories, enterprise, regenerative, health, arts, community, technology, education]`;

    try {
      const response = await trackedClaudeCompletion(prompt, SCRIPT_NAME, {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 2000,
        operation: 'score-batch',
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('  Failed to parse scorer response');
        continue;
      }

      const scores = JSON.parse(jsonMatch[0]);

      for (const score of scores) {
        const grant = batch[score.grantIndex];
        if (!grant) continue;

        results.push({
          grant,
          fitScore: Math.min(100, Math.max(0, score.fitScore || 0)),
          eligibilityScore: Math.min(100, Math.max(0, score.eligibilityScore || 0)),
          alignedProjects: score.alignedProjects || [],
          categories: score.categories || [],
          fitNotes: score.fitNotes || null,
        });
      }
    } catch (err) {
      console.error(`  Error scoring batch:`, err.message);
      // Add grants with zero scores on error
      for (const grant of batch) {
        results.push({
          grant,
          fitScore: 0,
          eligibilityScore: 0,
          alignedProjects: [],
          categories: grant.categories || [],
          fitNotes: 'Scoring failed',
        });
      }
    }
  }

  return results;
}

export default { scoreGrantBatch };
