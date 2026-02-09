#!/usr/bin/env node
/**
 * Meeting Intelligence Extractor
 *
 * Uses LLM to extract structured intelligence from meeting notes:
 * - Action items (with assignees)
 * - Decisions (with rationale)
 * - Key topics discussed
 * - Follow-up needed
 * - Financial mentions
 * - People mentioned (for relationship scoring)
 *
 * Each extracted item becomes a separate project_knowledge record
 * linked to the parent meeting via knowledge_edges.
 *
 * Usage:
 *   import { MeetingIntelligence } from './lib/meeting-intelligence.mjs';
 *   const mi = new MeetingIntelligence();
 *   await mi.processMeeting(meetingId);
 *   await mi.processUnprocessedMeetings();
 *
 * CLI:
 *   node scripts/lib/meeting-intelligence.mjs --process-all
 *   node scripts/lib/meeting-intelligence.mjs --process <meeting-id>
 *   node scripts/lib/meeting-intelligence.mjs --stats
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXTRACTION_PROMPT = `You are an organizational intelligence agent for ACT (A Curious Tractor), a social enterprise ecosystem. Analyze this meeting note and extract structured information.

MEETING TITLE: {title}
DATE: {date}
ATTENDEES: {attendees}
PROJECT: {project}

MEETING CONTENT:
{content}

Extract the following as JSON:
{
  "summary": "2-3 sentence summary of the meeting",
  "action_items": [
    {
      "action": "what needs to be done",
      "assignee": "who should do it (name or null if unclear)",
      "priority": "high|medium|low",
      "deadline_hint": "any mentioned deadline or null"
    }
  ],
  "decisions": [
    {
      "decision": "what was decided",
      "rationale": "why (if discussed)",
      "status": "decided|proposed|deferred"
    }
  ],
  "topics": ["list", "of", "key", "topics"],
  "financial_mentions": [
    {
      "description": "what was mentioned",
      "amount": "dollar amount or null",
      "type": "revenue|expense|budget|funding|investment"
    }
  ],
  "people_mentioned": ["names of people discussed but not present"],
  "follow_up_needed": true/false,
  "follow_up_date_hint": "mentioned date or null",
  "sentiment": "positive|neutral|mixed|concerned",
  "strategic_relevance": "how this meeting connects to ACT's goals of enterprise revenue, grants, and community impact"
}

Return ONLY valid JSON. If a field has no items, use an empty array []. Be precise about action items — only include explicit actions, not general discussion topics.`;

export class MeetingIntelligence {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Process a single meeting — extract intelligence and store it.
   */
  async processMeeting(meetingId) {
    // Fetch the meeting
    const { data: meeting, error } = await this.supabase
      .from('project_knowledge')
      .select('*')
      .eq('id', meetingId)
      .eq('knowledge_type', 'meeting')
      .single();

    if (error || !meeting) {
      console.warn(`Meeting ${meetingId} not found`);
      return null;
    }

    if (this.verbose) {
      console.log(`\nProcessing: ${meeting.title} (${meeting.recorded_at})`);
      console.log(`  Project: ${meeting.project_code}`);
      console.log(`  Content: ${meeting.content?.length || 0} chars`);
    }

    // Skip if content is too short
    if (!meeting.content || meeting.content.length < 50) {
      if (this.verbose) console.log('  Skipped: content too short');
      return null;
    }

    // Build the prompt
    const prompt = EXTRACTION_PROMPT
      .replace('{title}', meeting.title || 'Untitled')
      .replace('{date}', meeting.recorded_at || 'Unknown')
      .replace('{attendees}', (meeting.participants || []).join(', ') || 'Unknown')
      .replace('{project}', `${meeting.project_code} - ${meeting.project_name || ''}`)
      .replace('{content}', meeting.content.slice(0, 6000));

    // Call LLM
    const extraction = await this._callLLM(prompt);
    if (!extraction) {
      console.warn(`  LLM extraction failed for ${meetingId}`);
      return null;
    }

    if (this.verbose) {
      console.log(`  Summary: ${extraction.summary?.slice(0, 100)}...`);
      console.log(`  Action items: ${extraction.action_items?.length || 0}`);
      console.log(`  Decisions: ${extraction.decisions?.length || 0}`);
      console.log(`  Topics: ${extraction.topics?.join(', ')}`);
      console.log(`  Financial mentions: ${extraction.financial_mentions?.length || 0}`);
    }

    if (this.dryRun) return extraction;

    // Store extracted intelligence
    const results = {
      meetingId,
      actionItems: [],
      decisions: [],
      edges: 0
    };

    // Update the meeting record with summary and topics
    await this.supabase
      .from('project_knowledge')
      .update({
        summary: extraction.summary,
        topics: extraction.topics || [],
        sentiment: extraction.sentiment,
        action_required: extraction.follow_up_needed || false,
        metadata: {
          ...(meeting.metadata || {}),
          intelligence_extracted: true,
          extraction_date: new Date().toISOString(),
          financial_mentions: extraction.financial_mentions || [],
          people_mentioned: extraction.people_mentioned || [],
          strategic_relevance: extraction.strategic_relevance
        }
      })
      .eq('id', meetingId);

    // Create action item records
    for (const action of (extraction.action_items || [])) {
      const { data: actionRecord, error: actionErr } = await this.supabase
        .from('project_knowledge')
        .insert({
          project_code: meeting.project_code,
          project_name: meeting.project_name,
          knowledge_type: 'action',
          title: action.action,
          content: `Action from meeting "${meeting.title}" (${meeting.recorded_at}):\n${action.action}\n\nAssignee: ${action.assignee || 'Unassigned'}\nPriority: ${action.priority || 'medium'}`,
          source_type: 'meeting_extraction',
          source_ref: meetingId,
          source_url: meeting.source_url,
          participants: action.assignee ? [action.assignee] : meeting.participants,
          importance: action.priority === 'high' ? 'high' : 'normal',
          action_required: true,
          action_items: [{ action: action.action, assignee: action.assignee, priority: action.priority, deadline: action.deadline_hint }],
          follow_up_date: action.deadline_hint ? this._parseDate(action.deadline_hint) : null,
          recorded_at: meeting.recorded_at,
          recorded_by: 'meeting-intelligence'
        })
        .select('id')
        .single();

      if (!actionErr && actionRecord) {
        results.actionItems.push(actionRecord.id);

        // Edge: action → derived_from → meeting
        await this.supabase.from('knowledge_edges').upsert({
          source_type: 'project_knowledge',
          source_id: actionRecord.id,
          target_type: 'project_knowledge',
          target_id: meetingId,
          edge_type: 'derived_from',
          strength: 0.9,
          confidence: 0.9,
          created_by: 'meeting-intelligence',
          reasoning: 'Action item extracted from meeting'
        }, { onConflict: 'source_type,source_id,target_type,target_id,edge_type' });
        results.edges++;
      }
    }

    // Create decision records
    for (const decision of (extraction.decisions || [])) {
      const { data: decisionRecord, error: decisionErr } = await this.supabase
        .from('project_knowledge')
        .insert({
          project_code: meeting.project_code,
          project_name: meeting.project_name,
          knowledge_type: 'decision',
          title: decision.decision,
          content: `Decision from meeting "${meeting.title}" (${meeting.recorded_at}):\n${decision.decision}\n\nRationale: ${decision.rationale || 'Not stated'}`,
          source_type: 'meeting_extraction',
          source_ref: meetingId,
          source_url: meeting.source_url,
          participants: meeting.participants,
          decision_status: decision.status || 'decided',
          decision_rationale: decision.rationale,
          recorded_at: meeting.recorded_at,
          recorded_by: 'meeting-intelligence'
        })
        .select('id')
        .single();

      if (!decisionErr && decisionRecord) {
        results.decisions.push(decisionRecord.id);

        // Edge: decision → decided_in → meeting
        await this.supabase.from('knowledge_edges').upsert({
          source_type: 'project_knowledge',
          source_id: decisionRecord.id,
          target_type: 'project_knowledge',
          target_id: meetingId,
          edge_type: 'decided_in',
          strength: 0.9,
          confidence: 0.9,
          created_by: 'meeting-intelligence',
          reasoning: 'Decision extracted from meeting'
        }, { onConflict: 'source_type,source_id,target_type,target_id,edge_type' });
        results.edges++;
      }
    }

    if (this.verbose) {
      console.log(`  Stored: ${results.actionItems.length} actions, ${results.decisions.length} decisions, ${results.edges} edges`);
    }

    return results;
  }

  /**
   * Process all meetings that haven't been extracted yet.
   */
  async processUnprocessedMeetings(limit = 50) {
    // Find meetings without intelligence extraction
    const { data: meetings, error } = await this.supabase
      .from('project_knowledge')
      .select('id, title, recorded_at, project_code')
      .eq('knowledge_type', 'meeting')
      .or('metadata->>intelligence_extracted.is.null,metadata->>intelligence_extracted.eq.false')
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!meetings || meetings.length === 0) {
      console.log('No unprocessed meetings found.');
      return [];
    }

    console.log(`Found ${meetings.length} unprocessed meetings\n`);

    const results = [];
    for (const meeting of meetings) {
      try {
        const result = await this.processMeeting(meeting.id);
        if (result) results.push(result);

        // Rate limit: 1 per second for LLM calls
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error processing ${meeting.title}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Get stats on meeting intelligence extraction.
   */
  async getStats() {
    const { count: totalMeetings } = await this.supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'meeting');

    const { count: extractedMeetings } = await this.supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'meeting')
      .eq('metadata->>intelligence_extracted', 'true');

    const { count: actionItems } = await this.supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .eq('source_type', 'meeting_extraction');

    const { count: decisions } = await this.supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'decision')
      .eq('source_type', 'meeting_extraction');

    return {
      totalMeetings: totalMeetings || 0,
      extractedMeetings: extractedMeetings || 0,
      unprocessed: (totalMeetings || 0) - (extractedMeetings || 0),
      actionItems: actionItems || 0,
      decisions: decisions || 0
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  async _callLLM(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        console.warn(`LLM API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content);
    } catch (err) {
      console.warn(`LLM parse error: ${err.message}`);
      return null;
    }
  }

  _parseDate(hint) {
    if (!hint) return null;
    try {
      const d = new Date(hint);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    } catch { return null; }
  }
}

export default MeetingIntelligence;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const mi = new MeetingIntelligence({
    verbose: true,
    dryRun: args.includes('--dry-run')
  });

  console.log('Meeting Intelligence Extractor');
  console.log('='.repeat(50));

  if (args.includes('--stats')) {
    const stats = await mi.getStats();
    console.log(`\nMeeting Intelligence Stats:`);
    console.log(`  Total meetings:      ${stats.totalMeetings}`);
    console.log(`  Extracted:           ${stats.extractedMeetings}`);
    console.log(`  Unprocessed:         ${stats.unprocessed}`);
    console.log(`  Action items found:  ${stats.actionItems}`);
    console.log(`  Decisions found:     ${stats.decisions}`);
  } else if (args.includes('--process-all')) {
    const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 50;
    const results = await mi.processUnprocessedMeetings(limit);
    console.log(`\nProcessed ${results.length} meetings`);
    const totalActions = results.reduce((s, r) => s + (r?.actionItems?.length || 0), 0);
    const totalDecisions = results.reduce((s, r) => s + (r?.decisions?.length || 0), 0);
    console.log(`  Total action items: ${totalActions}`);
    console.log(`  Total decisions: ${totalDecisions}`);
  } else if (args.includes('--process') && args.length >= 2) {
    const meetingId = args[args.indexOf('--process') + 1];
    const result = await mi.processMeeting(meetingId);
    if (result) {
      console.log('\nExtraction complete:', JSON.stringify(result, null, 2));
    }
  } else {
    console.log(`
Usage:
  node scripts/lib/meeting-intelligence.mjs --stats                   Show stats
  node scripts/lib/meeting-intelligence.mjs --process-all             Process all unextracted
  node scripts/lib/meeting-intelligence.mjs --process-all --limit 10  Process 10 meetings
  node scripts/lib/meeting-intelligence.mjs --process <meeting-id>    Process one meeting
  node scripts/lib/meeting-intelligence.mjs --process-all --dry-run   Preview extraction
`);
  }
}
