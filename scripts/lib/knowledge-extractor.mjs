/**
 * Knowledge Extractor: LLM-Powered Decision/Action Extraction
 *
 * Reads meeting content from project_knowledge and uses Claude to extract:
 * - Decisions made
 * - Action items (with owners and dates where mentioned)
 * - Key insights
 *
 * Extracted items are saved back as new project_knowledge records
 * with knowledge_type 'decision' or 'action'.
 *
 * Usage:
 *   import { KnowledgeExtractor } from './lib/knowledge-extractor.mjs';
 *   const extractor = new KnowledgeExtractor({ supabase, verbose: true });
 *   const result = await extractor.extractFromMeetings(48); // last 48 hours
 */

import { trackedClaudeCompletion } from './llm-client.mjs';

const SCRIPT_NAME = 'knowledge-extractor';

const EXTRACTION_PROMPT = `You are analyzing meeting notes from an organization called ACT (A Curious Tractor) — a regenerative innovation ecosystem working with First Nations communities in Australia.

Extract any DECISIONS made and ACTION ITEMS committed to. Be conservative — only extract items that are clearly stated, not implied.

For each item, return JSON in this exact format:
{
  "decisions": [
    {
      "title": "Short description of the decision",
      "content": "Fuller context of what was decided and why",
      "importance": "high" | "normal" | "low",
      "participants": ["Name1", "Name2"]
    }
  ],
  "actions": [
    {
      "title": "What needs to be done",
      "content": "Details and context",
      "owner": "Person responsible (or null if unclear)",
      "follow_up_date": "YYYY-MM-DD (or null if no date mentioned)",
      "importance": "high" | "normal" | "low",
      "participants": ["Name1"]
    }
  ]
}

Rules:
- If there are no clear decisions or actions, return empty arrays
- Don't fabricate — only extract what's explicitly stated
- Keep titles under 80 characters
- Include participant names when mentioned
- For follow_up_date, only include if a specific date or timeframe is mentioned
- Return ONLY valid JSON, no markdown fences or explanation`;

export class KnowledgeExtractor {
  constructor(options = {}) {
    this.supabase = options.supabase;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.maxPerRun = options.maxPerRun || 20;
  }

  /**
   * Extract decisions/actions from recent meetings that haven't been processed yet.
   * @param {number} lookbackHours - How far back to look for unprocessed meetings
   */
  async extractFromMeetings(lookbackHours = 48) {
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    // Find meetings that haven't been extracted yet
    // We mark extracted meetings by setting metadata.extracted = true
    const { data: meetings, error } = await this.supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, project_name, recorded_at, participants, metadata')
      .eq('knowledge_type', 'meeting')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(this.maxPerRun);

    if (error) {
      console.error('Failed to fetch meetings:', error.message);
      return { error: error.message };
    }

    // Filter out already-extracted meetings
    const unprocessed = (meetings || []).filter(m =>
      !m.metadata?.extracted
    );

    if (unprocessed.length === 0) {
      if (this.verbose) console.log('  No unprocessed meetings found');
      return { processed: 0, decisions: 0, actions: 0 };
    }

    console.log(`  Found ${unprocessed.length} unprocessed meetings`);

    let totalDecisions = 0;
    let totalActions = 0;
    let processed = 0;

    for (const meeting of unprocessed) {
      const content = meeting.content || '';
      if (content.length < 100) {
        if (this.verbose) console.log(`  Skipping "${meeting.title}" — too short (${content.length} chars)`);
        continue;
      }

      try {
        const result = await this.extractFromContent(meeting);
        totalDecisions += result.decisions;
        totalActions += result.actions;
        processed++;

        // Mark meeting as extracted
        if (!this.dryRun) {
          await this.supabase
            .from('project_knowledge')
            .update({
              metadata: {
                ...(meeting.metadata || {}),
                extracted: true,
                extracted_at: new Date().toISOString(),
                extracted_decisions: result.decisions,
                extracted_actions: result.actions,
              }
            })
            .eq('id', meeting.id);
        }
      } catch (err) {
        console.error(`  Error extracting from "${meeting.title}": ${err.message}`);
      }
    }

    return { processed, decisions: totalDecisions, actions: totalActions };
  }

  /**
   * Extract decisions/actions from a single meeting's content
   */
  async extractFromContent(meeting) {
    const truncatedContent = meeting.content.slice(0, 6000); // Keep under token limit
    const prompt = `Meeting: "${meeting.title}"
Project: ${meeting.project_code || 'Unknown'}
Date: ${meeting.recorded_at}
${meeting.participants?.length ? `Participants: ${meeting.participants.join(', ')}` : ''}

--- CONTENT ---
${truncatedContent}
--- END ---

Extract decisions and action items from this meeting.`;

    if (this.verbose) {
      console.log(`  Extracting from: "${meeting.title}" (${truncatedContent.length} chars)`);
    }

    const response = await trackedClaudeCompletion(
      prompt,
      SCRIPT_NAME,
      {
        system: EXTRACTION_PROMPT,
        maxTokens: 2000,
        operation: 'extract-knowledge',
      }
    );

    // Parse the JSON response
    let extracted;
    try {
      // Handle potential markdown fences
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch (parseErr) {
      if (this.verbose) console.log(`  Failed to parse LLM response for "${meeting.title}"`);
      return { decisions: 0, actions: 0 };
    }

    const decisions = extracted.decisions || [];
    const actions = extracted.actions || [];

    if (decisions.length === 0 && actions.length === 0) {
      if (this.verbose) console.log(`  No decisions or actions found in "${meeting.title}"`);
      return { decisions: 0, actions: 0 };
    }

    console.log(`  "${meeting.title}": ${decisions.length} decisions, ${actions.length} actions`);

    if (this.dryRun) {
      for (const d of decisions) console.log(`    [decision] ${d.title}`);
      for (const a of actions) console.log(`    [action] ${a.title}${a.owner ? ` → ${a.owner}` : ''}`);
      return { decisions: decisions.length, actions: actions.length };
    }

    // Save decisions
    for (const decision of decisions) {
      await this.saveExtracted(meeting, 'decision', decision);
    }

    // Save actions
    for (const action of actions) {
      await this.saveExtracted(meeting, 'action', {
        ...action,
        action_required: true,
        status: 'open',
      });
    }

    return { decisions: decisions.length, actions: actions.length };
  }

  /**
   * Save an extracted item to project_knowledge
   */
  async saveExtracted(meeting, knowledgeType, item) {
    // Check for duplicates by title similarity
    const { data: existing } = await this.supabase
      .from('project_knowledge')
      .select('id')
      .eq('knowledge_type', knowledgeType)
      .eq('project_code', meeting.project_code)
      .ilike('title', item.title)
      .limit(1);

    if (existing?.length > 0) {
      if (this.verbose) console.log(`    Skip duplicate: "${item.title}"`);
      return;
    }

    const record = {
      project_code: meeting.project_code,
      project_name: meeting.project_name,
      knowledge_type: knowledgeType,
      title: item.title,
      content: item.content,
      importance: item.importance || 'normal',
      participants: item.participants || meeting.participants || [],
      source_type: 'llm_extraction',
      recorded_at: meeting.recorded_at,
      recorded_by: 'knowledge-extractor',
      action_required: item.action_required || false,
      status: item.status || null,
      follow_up_date: item.follow_up_date || null,
      metadata: {
        source_meeting_id: meeting.id,
        source_meeting_title: meeting.title,
        extracted_by: SCRIPT_NAME,
        owner: item.owner || null,
      },
    };

    const { error } = await this.supabase
      .from('project_knowledge')
      .insert(record);

    if (error) {
      console.error(`    Failed to save ${knowledgeType}: ${error.message}`);
    } else if (this.verbose) {
      console.log(`    Saved ${knowledgeType}: "${item.title}"`);
    }
  }
}
