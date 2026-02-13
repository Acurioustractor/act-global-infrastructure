#!/usr/bin/env node
/**
 * Voice Note Search
 *
 * Search voice notes by project, person, or semantic query.
 * Supports multiple search modes:
 *
 * - Project:   Find all voice notes linked to a project
 * - Person:    Find voice notes mentioning a person
 * - Query:     Semantic search across all transcripts
 * - Recent:    Show recent voice notes
 * - Actions:   Show voice notes with pending action items
 *
 * Usage:
 *   node scripts/voice-search.mjs --project ACT-JH
 *   node scripts/voice-search.mjs --person "Kristy"
 *   node scripts/voice-search.mjs --query "funding conversations"
 *   node scripts/voice-search.mjs --recent [days]
 *   node scripts/voice-search.mjs --actions
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 *   OPENAI_API_KEY            - For semantic search embeddings
 */

import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Load project codes
let PROJECT_CODES = {};
try {
  PROJECT_CODES = await loadProjectsConfig();
} catch (e) {
  console.warn('Could not load project codes');
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set - semantic search unavailable');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 384  // Match voice_notes embedding dimension
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Embedding API error:', error);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    return null;
  }
}

// ============================================================================
// SEARCH BY PROJECT
// ============================================================================

async function searchByProject(projectCode) {
  const normalizedCode = projectCode.toUpperCase().startsWith('ACT-')
    ? projectCode.toUpperCase()
    : `ACT-${projectCode.toUpperCase()}`;

  const project = PROJECT_CODES.projects?.[normalizedCode];
  const searchTerms = [
    normalizedCode.toLowerCase(),
    normalizedCode.toLowerCase().replace('act-', ''),
    project?.name?.toLowerCase()
  ].filter(Boolean);

  console.log(`\n🎙️ Voice Notes for ${normalizedCode}${project ? ` - ${project.name}` : ''}\n`);

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  // Search by project_context
  const { data: byContext } = await supabase
    .from('voice_notes')
    .select('*')
    .or(searchTerms.map(t => `project_context.ilike.%${t}%`).join(','))
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Also search by topics array
  const { data: byTopics } = await supabase
    .from('voice_notes')
    .select('*')
    .overlaps('topics', searchTerms)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Combine and dedupe
  const allResults = new Map();
  [...(byContext || []), ...(byTopics || [])].forEach(vn => {
    allResults.set(vn.id, vn);
  });

  const results = Array.from(allResults.values())
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

  displayResults(results, 'project');
  return results;
}

// ============================================================================
// SEARCH BY PERSON
// ============================================================================

async function searchByPerson(personName) {
  console.log(`\n👤 Voice Notes mentioning "${personName}"\n`);

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  const searchPattern = `%${personName}%`;

  // Search mentioned_people array and transcript
  const { data: byMentioned } = await supabase
    .from('voice_notes')
    .select('*')
    .contains('mentioned_people', [personName])
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Also search transcript for name
  const { data: byTranscript } = await supabase
    .from('voice_notes')
    .select('*')
    .ilike('transcript', searchPattern)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Combine and dedupe
  const allResults = new Map();
  [...(byMentioned || []), ...(byTranscript || [])].forEach(vn => {
    allResults.set(vn.id, vn);
  });

  const results = Array.from(allResults.values())
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

  displayResults(results, 'person', personName);
  return results;
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

async function searchSemantic(query) {
  console.log(`\n🔍 Searching: "${query}"\n`);

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  // First try text-based search
  const searchPattern = `%${query}%`;
  const { data: textResults } = await supabase
    .from('voice_notes')
    .select('*')
    .or(`transcript.ilike.${searchPattern},summary.ilike.${searchPattern}`)
    .order('recorded_at', { ascending: false })
    .limit(20);

  // Then try semantic search if embeddings available
  const embedding = await generateEmbedding(query);
  let semanticResults = [];

  if (embedding) {
    // Use the search_voice_notes function
    const { data: vectorResults, error } = await supabase
      .rpc('search_voice_notes', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 20
      });

    if (!error && vectorResults) {
      semanticResults = vectorResults;
    }
  }

  // Combine results, prioritizing semantic matches
  const allResults = new Map();

  // Add text results first (lower priority)
  (textResults || []).forEach(vn => {
    allResults.set(vn.id, { ...vn, matchType: 'text' });
  });

  // Add/update with semantic results (higher priority)
  (semanticResults || []).forEach(vn => {
    const existing = allResults.get(vn.id);
    allResults.set(vn.id, {
      ...existing,
      ...vn,
      matchType: 'semantic',
      similarity: vn.similarity
    });
  });

  const results = Array.from(allResults.values())
    .sort((a, b) => {
      // Semantic matches first, then by date
      if (a.matchType === 'semantic' && b.matchType !== 'semantic') return -1;
      if (b.matchType === 'semantic' && a.matchType !== 'semantic') return 1;
      if (a.similarity && b.similarity) return b.similarity - a.similarity;
      return new Date(b.recorded_at) - new Date(a.recorded_at);
    });

  displayResults(results, 'query', query);
  return results;
}

// ============================================================================
// RECENT VOICE NOTES
// ============================================================================

async function searchRecent(days = 7) {
  console.log(`\n📅 Voice Notes from the last ${days} days\n`);

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: results } = await supabase
    .from('voice_notes')
    .select('*')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false });

  displayResults(results || [], 'recent');
  return results || [];
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

async function searchActions() {
  console.log('\n✅ Voice Notes with Action Items\n');

  if (!supabase) {
    console.error('Database connection required');
    return [];
  }

  const { data: results } = await supabase
    .from('voice_notes')
    .select('*')
    .not('action_items', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Filter to only those with actual action items
  const withActions = (results || []).filter(vn =>
    vn.action_items && (Array.isArray(vn.action_items) ? vn.action_items.length > 0 : true)
  );

  displayResults(withActions, 'actions');

  // Also show a summary of action items
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Action Item Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  withActions.forEach(vn => {
    const date = new Date(vn.recorded_at).toLocaleDateString('en-AU');
    const project = vn.project_context || 'General';
    console.log(`📅 ${date} | ${project}`);

    const actions = Array.isArray(vn.action_items)
      ? vn.action_items
      : [vn.action_items];

    actions.forEach(action => {
      if (typeof action === 'string') {
        console.log(`  [ ] ${action}`);
      } else if (action.text) {
        console.log(`  [ ] ${action.text}${action.assigned_to ? ` (@${action.assigned_to})` : ''}`);
      }
    });
    console.log('');
  });

  return withActions;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

function displayResults(results, searchType, searchTerm = null) {
  if (results.length === 0) {
    console.log('No voice notes found.\n');
    return;
  }

  console.log(`Found ${results.length} voice note(s):\n`);
  console.log('-'.repeat(70));

  results.forEach((vn, i) => {
    const date = new Date(vn.recorded_at).toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    const time = new Date(vn.recorded_at).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Header
    console.log(`\n${i + 1}. 📅 ${date} ${time}`);

    // Project context
    if (vn.project_context) {
      console.log(`   📁 Project: ${vn.project_context}`);
    }

    // Duration
    if (vn.duration_seconds) {
      const mins = Math.floor(vn.duration_seconds / 60);
      const secs = vn.duration_seconds % 60;
      console.log(`   ⏱️ Duration: ${mins}:${secs.toString().padStart(2, '0')}`);
    }

    // Topics
    if (vn.topics && vn.topics.length > 0) {
      console.log(`   🏷️ Topics: ${vn.topics.slice(0, 5).join(', ')}`);
    }

    // Mentioned people
    if (vn.mentioned_people && vn.mentioned_people.length > 0) {
      console.log(`   👥 People: ${vn.mentioned_people.join(', ')}`);
    }

    // Similarity score for semantic search
    if (vn.similarity) {
      console.log(`   🎯 Match: ${Math.round(vn.similarity * 100)}%`);
    }

    // Summary or transcript excerpt
    const text = vn.summary || vn.transcript;
    if (text) {
      let excerpt = text.slice(0, 200);

      // Highlight search term if present
      if (searchTerm && searchType !== 'project') {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        excerpt = excerpt.replace(regex, '**$1**');
      }

      console.log(`   📝 "${excerpt}${text.length > 200 ? '...' : ''}"`);
    }

    // Action items
    if (vn.action_items && (Array.isArray(vn.action_items) ? vn.action_items.length > 0 : true)) {
      const actions = Array.isArray(vn.action_items) ? vn.action_items : [vn.action_items];
      const count = actions.length;
      console.log(`   ✅ ${count} action item${count !== 1 ? 's' : ''}`);
    }

    // Cultural flag
    if (vn.requires_cultural_review) {
      console.log(`   ⚠️ Requires cultural review`);
    }
  });

  console.log('\n' + '-'.repeat(70));
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    project: null,
    person: null,
    query: null,
    recent: null,
    actions: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
    } else if (arg === '--person' || arg === '-u') {
      options.person = args[++i];
    } else if (arg === '--query' || arg === '-q') {
      options.query = args[++i];
    } else if (arg === '--recent' || arg === '-r') {
      options.recent = parseInt(args[++i]) || 7;
    } else if (arg === '--actions' || arg === '-a') {
      options.actions = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      // Default to query if no flag
      options.query = arg;
    }
  }

  return options;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Voice Note Search

Usage:
  node scripts/voice-search.mjs [options] [query]

Options:
  --project, -p <code>   Search by project code (e.g., ACT-JH)
  --person, -u <name>    Search by person mentioned
  --query, -q <text>     Semantic search across transcripts
  --recent, -r [days]    Show recent voice notes (default: 7 days)
  --actions, -a          Show voice notes with action items
  --help, -h             Show this help

Examples:
  node scripts/voice-search.mjs --project ACT-JH
  node scripts/voice-search.mjs --person "Kristy"
  node scripts/voice-search.mjs "funding conversations"
  node scripts/voice-search.mjs --recent 14
  node scripts/voice-search.mjs --actions

Note: Semantic search requires OPENAI_API_KEY environment variable.
`);
    return;
  }

  if (!supabase) {
    console.error('Error: Database connection required. Check SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  if (options.project) {
    await searchByProject(options.project);
  } else if (options.person) {
    await searchByPerson(options.person);
  } else if (options.query) {
    await searchSemantic(options.query);
  } else if (options.recent !== null) {
    await searchRecent(options.recent);
  } else if (options.actions) {
    await searchActions();
  } else {
    // Default: show recent
    await searchRecent(7);
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
