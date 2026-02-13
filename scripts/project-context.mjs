#!/usr/bin/env node
/**
 * Project Context Retrieval
 *
 * Surface relevant project knowledge for decision-making.
 * Queries the unified project_knowledge table to provide context.
 *
 * Usage:
 *   # Get all context for a project
 *   node scripts/project-context.mjs --project ACT-HV
 *
 *   # Get specific knowledge types
 *   node scripts/project-context.mjs -p harvest --type decision
 *   node scripts/project-context.mjs -p harvest --type question
 *
 *   # Semantic search within a project
 *   node scripts/project-context.mjs -p ACT-HV --query "Grant lease terms"
 *
 *   # Recent activity
 *   node scripts/project-context.mjs -p harvest --recent 7
 *
 *   # Timeline view
 *   node scripts/project-context.mjs -p harvest --timeline
 *
 *   # Decision summary
 *   node scripts/project-context.mjs -p harvest --decisions
 *
 *   # Open questions
 *   node scripts/project-context.mjs -p harvest --questions
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 *   OPENAI_API_KEY            - For semantic search
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
  // Ignore
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeProjectCode(code) {
  if (!code) return null;

  const shortcuts = {
    'harvest': 'ACT-HV', 'hv': 'ACT-HV',
    'justicehub': 'ACT-JH', 'jh': 'ACT-JH',
    'goods': 'ACT-GD', 'gd': 'ACT-GD',
    'farm': 'ACT-FM', 'fm': 'ACT-FM',
    'el': 'ACT-EL', 'empathy': 'ACT-EL',
    'picc': 'ACT-PC', 'pc': 'ACT-PC'
  };

  const lower = code.toLowerCase();
  if (shortcuts[lower]) return shortcuts[lower];

  if (!code.toUpperCase().startsWith('ACT-')) {
    return `ACT-${code.toUpperCase()}`;
  }

  return code.toUpperCase();
}

async function generateEmbedding(text) {
  if (!OPENAI_API_KEY || !text) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
        dimensions: 384
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

const TYPE_ICONS = {
  reflection: '💭',
  decision: '⚖️',
  meeting: '📅',
  voice_note: '🎙️',
  document: '📄',
  event: '📌',
  question: '❓',
  link: '🔗',
  communication: '💬',
  milestone: '🎯'
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

function truncate(text, maxLen = 200) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function displayKnowledgeItem(item, showType = true) {
  const icon = TYPE_ICONS[item.knowledge_type] || '📝';
  const date = formatDate(item.recorded_at);
  const importance = item.importance === 'critical' ? ' ⚠️ CRITICAL' :
                     item.importance === 'high' ? ' ⭐' : '';

  console.log(`\n${icon} ${showType ? item.knowledge_type.toUpperCase() + ' | ' : ''}${date}${importance}`);

  if (item.title) {
    console.log(`   ${item.title}`);
  }

  if (item.content && item.content !== item.title) {
    console.log(`   ${truncate(item.content, 300)}`);
  }

  if (item.decision_status) {
    console.log(`   Status: ${item.decision_status}`);
  }

  if (item.decision_rationale && item.decision_rationale !== item.content) {
    console.log(`   Rationale: ${truncate(item.decision_rationale, 150)}`);
  }

  if (item.participants?.length > 0) {
    console.log(`   👥 ${item.participants.join(', ')}`);
  }

  if (item.topics?.length > 0) {
    console.log(`   🏷️ ${item.topics.join(', ')}`);
  }

  if (item.action_required) {
    console.log(`   ✅ Action required`);
  }

  if (item.follow_up_date) {
    console.log(`   📆 Follow up: ${formatDate(item.follow_up_date)}`);
  }

  if (item.source_url) {
    console.log(`   🔗 ${item.source_url}`);
  }

  if (item.similarity) {
    console.log(`   🎯 Match: ${Math.round(item.similarity * 100)}%`);
  }
}

// ============================================================================
// CONTEXT RETRIEVAL FUNCTIONS
// ============================================================================

async function getProjectContext(projectCode, days = 30) {
  const normalized = normalizeProjectCode(projectCode);
  const projectName = PROJECT_CODES.projects?.[normalized]?.name || '';

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  📚 Project Context: ${normalized}${projectName ? ` - ${projectName}` : ''}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  // Get context using the function
  const { data: context, error } = await supabase
    .rpc('get_project_context', {
      p_project_code: normalized,
      p_days: days
    });

  if (error) {
    // Function may not exist yet, fall back to direct query
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: fallback } = await supabase
      .from('project_knowledge')
      .select('*')
      .eq('project_code', normalized)
      .or(`recorded_at.gte.${cutoff},importance.in.(critical,high)`)
      .order('importance', { ascending: true })
      .order('recorded_at', { ascending: false })
      .limit(25);

    if (fallback?.length > 0) {
      console.log(`\n📊 ${fallback.length} items (last ${days} days + critical/high priority)\n`);
      fallback.forEach(item => displayKnowledgeItem(item));
    } else {
      console.log('\nNo context found. Start capturing with:');
      console.log(`  node scripts/capture-knowledge.mjs -p ${normalized} -r "Your reflection"`);
    }
    return;
  }

  if (context?.length > 0) {
    console.log(`\n📊 ${context.length} items (last ${days} days + critical/high priority)\n`);
    context.forEach(item => displayKnowledgeItem(item));
  } else {
    console.log('\nNo context found. Start capturing with:');
    console.log(`  node scripts/capture-knowledge.mjs -p ${normalized} -r "Your reflection"`);
  }
}

async function getProjectTimeline(projectCode, limit = 30, types = null) {
  const normalized = normalizeProjectCode(projectCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  📅 Timeline: ${normalized}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  let query = supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (types?.length > 0) {
    query = query.in('knowledge_type', types);
  }

  const { data: timeline } = await query;

  if (timeline?.length > 0) {
    console.log(`\n${timeline.length} items:\n`);

    // Group by week
    let currentWeek = null;
    timeline.forEach(item => {
      const date = new Date(item.recorded_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (weekKey !== currentWeek) {
        currentWeek = weekKey;
        console.log(`\n─── Week of ${formatDate(weekStart)} ───`);
      }

      displayKnowledgeItem(item);
    });
  } else {
    console.log('\nNo timeline entries found.');
  }
}

async function getProjectDecisions(projectCode) {
  const normalized = normalizeProjectCode(projectCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ⚖️ Decisions: ${normalized}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  const { data: decisions } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .eq('knowledge_type', 'decision')
    .order('recorded_at', { ascending: false });

  if (decisions?.length > 0) {
    console.log(`\n${decisions.length} decision(s):\n`);

    // Group by status
    const byStatus = {
      decided: [],
      proposed: [],
      implemented: [],
      revisited: []
    };

    decisions.forEach(d => {
      const status = d.decision_status || 'decided';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(d);
    });

    for (const [status, items] of Object.entries(byStatus)) {
      if (items.length > 0) {
        console.log(`\n─── ${status.toUpperCase()} ───`);
        items.forEach(item => displayKnowledgeItem(item, false));
      }
    }
  } else {
    console.log('\nNo decisions recorded.');
  }
}

async function getProjectQuestions(projectCode) {
  const normalized = normalizeProjectCode(projectCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ❓ Open Questions: ${normalized}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  const { data: questions } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .eq('knowledge_type', 'question')
    .eq('action_required', true)
    .order('importance', { ascending: true })
    .order('recorded_at', { ascending: false });

  if (questions?.length > 0) {
    console.log(`\n${questions.length} open question(s):\n`);
    questions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.title}`);
      if (q.content && q.content !== q.title) {
        console.log(`   ${truncate(q.content, 200)}`);
      }
      if (q.follow_up_date) {
        console.log(`   📆 Follow up: ${formatDate(q.follow_up_date)}`);
      }
      console.log('');
    });
  } else {
    console.log('\nNo open questions.');
  }
}

async function searchProjectKnowledge(projectCode, query) {
  const normalized = normalizeProjectCode(projectCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  🔍 Search: "${query}" in ${normalized}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  // Text search first
  const searchPattern = `%${query}%`;
  const { data: textResults } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
    .order('recorded_at', { ascending: false })
    .limit(20);

  // Semantic search if embedding available
  const embedding = await generateEmbedding(query);
  let semanticResults = [];

  if (embedding) {
    const { data: vectorResults } = await supabase
      .rpc('search_project_knowledge', {
        query_embedding: embedding,
        p_project_code: normalized,
        match_threshold: 0.5,
        match_count: 20
      });

    if (vectorResults) {
      semanticResults = vectorResults;
    }
  }

  // Combine results
  const allResults = new Map();

  (textResults || []).forEach(r => {
    allResults.set(r.id, { ...r, matchType: 'text' });
  });

  (semanticResults || []).forEach(r => {
    const existing = allResults.get(r.id);
    allResults.set(r.id, {
      ...existing,
      ...r,
      matchType: 'semantic',
      similarity: r.similarity
    });
  });

  const results = Array.from(allResults.values())
    .sort((a, b) => {
      if (a.matchType === 'semantic' && b.matchType !== 'semantic') return -1;
      if (b.matchType === 'semantic' && a.matchType !== 'semantic') return 1;
      if (a.similarity && b.similarity) return b.similarity - a.similarity;
      return new Date(b.recorded_at) - new Date(a.recorded_at);
    });

  if (results.length > 0) {
    console.log(`\n${results.length} result(s):\n`);
    results.forEach(item => displayKnowledgeItem(item));
  } else {
    console.log('\nNo matching knowledge found.');
  }
}

async function getRecentKnowledge(projectCode, days = 7) {
  const normalized = normalizeProjectCode(projectCode);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  🕐 Recent: ${normalized} (last ${days} days)`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  const { data: recent } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: false });

  if (recent?.length > 0) {
    console.log(`\n${recent.length} item(s):\n`);
    recent.forEach(item => displayKnowledgeItem(item));
  } else {
    console.log(`\nNo activity in the last ${days} days.`);
  }
}

async function getKnowledgeByType(projectCode, knowledgeType) {
  const normalized = normalizeProjectCode(projectCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ${TYPE_ICONS[knowledgeType] || '📝'} ${knowledgeType.toUpperCase()}: ${normalized}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!supabase) {
    console.error('\nDatabase connection required');
    return;
  }

  const { data: items } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_code', normalized)
    .eq('knowledge_type', knowledgeType)
    .order('recorded_at', { ascending: false })
    .limit(50);

  if (items?.length > 0) {
    console.log(`\n${items.length} item(s):\n`);
    items.forEach(item => displayKnowledgeItem(item, false));
  } else {
    console.log(`\nNo ${knowledgeType} entries found.`);
  }
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    project: null,
    query: null,
    type: null,
    recent: null,
    timeline: false,
    decisions: false,
    questions: false,
    days: 30,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
    } else if (arg === '--query' || arg === '-q') {
      options.query = args[++i];
    } else if (arg === '--type' || arg === '-t') {
      options.type = args[++i];
    } else if (arg === '--recent' || arg === '-r') {
      options.recent = parseInt(args[++i]) || 7;
    } else if (arg === '--timeline') {
      options.timeline = true;
    } else if (arg === '--decisions' || arg === '-d') {
      options.decisions = true;
    } else if (arg === '--questions') {
      options.questions = true;
    } else if (arg === '--days') {
      options.days = parseInt(args[++i]) || 30;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
Project Context Retrieval

Usage:
  node scripts/project-context.mjs [options]

Options:
  --project, -p <code>   Project code (required)
  --query, -q <text>     Semantic search within project
  --type, -t <type>      Filter by knowledge type
  --recent, -r <days>    Show recent activity (default: 7 days)
  --timeline             Show chronological timeline
  --decisions, -d        Show all decisions
  --questions            Show open questions
  --days <n>             Context window for default view (default: 30)
  --help, -h             Show this help

Knowledge Types:
  reflection, decision, meeting, voice_note, document,
  event, question, link, communication, milestone

Examples:
  # Full context for The Harvest
  node scripts/project-context.mjs -p harvest

  # Search for specific topic
  node scripts/project-context.mjs -p ACT-HV -q "Grant lease terms"

  # Show all decisions
  node scripts/project-context.mjs -p harvest --decisions

  # Show open questions
  node scripts/project-context.mjs -p harvest --questions

  # Timeline view
  node scripts/project-context.mjs -p harvest --timeline

  # Recent 14 days
  node scripts/project-context.mjs -p harvest -r 14

  # Filter by type
  node scripts/project-context.mjs -p harvest -t meeting
`);
    return;
  }

  if (!options.project) {
    console.error('Project code required. Use --project or -p');
    process.exit(1);
  }

  if (options.query) {
    await searchProjectKnowledge(options.project, options.query);
  } else if (options.decisions) {
    await getProjectDecisions(options.project);
  } else if (options.questions) {
    await getProjectQuestions(options.project);
  } else if (options.timeline) {
    await getProjectTimeline(options.project, 50, options.type ? [options.type] : null);
  } else if (options.recent !== null) {
    await getRecentKnowledge(options.project, options.recent);
  } else if (options.type) {
    await getKnowledgeByType(options.project, options.type);
  } else {
    await getProjectContext(options.project, options.days);
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
