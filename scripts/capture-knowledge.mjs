#!/usr/bin/env node
/**
 * Project Knowledge Capture CLI
 *
 * Quick capture of project knowledge from various sources.
 * The "catch-all" for project context, reflections, decisions, and links.
 *
 * Usage:
 *   # Quick reflection
 *   node scripts/capture-knowledge.mjs --project ACT-HV --reflection "Grant seems open to protection clauses"
 *
 *   # Decision
 *   node scripts/capture-knowledge.mjs --project ACT-HV --decision "Proceed with caution" --rationale "Score 2.2/5 but joy factor high"
 *
 *   # Meeting link (Notion)
 *   node scripts/capture-knowledge.mjs --project ACT-HV --meeting "https://notion.so/..." --title "Grant call 22 Jan"
 *
 *   # Document reference
 *   node scripts/capture-knowledge.mjs --project ACT-HV --document "docs/strategy/the-harvest-decision-strategic-advice.md"
 *
 *   # Event
 *   node scripts/capture-knowledge.mjs --project ACT-HV --event "Visited The Harvest site with Nic"
 *
 *   # Question
 *   node scripts/capture-knowledge.mjs --project ACT-HV --question "What is Grant's exit timeline?"
 *
 *   # Link external resource
 *   node scripts/capture-knowledge.mjs --project ACT-HV --link "https://..." --title "Similar community cafe model"
 *
 * Interactive mode:
 *   node scripts/capture-knowledge.mjs --interactive
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase access
 *   OPENAI_API_KEY            - For generating embeddings
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { resolve } from 'path';
import readline from 'readline';
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
        input: text.slice(0, 8000),  // Limit input size
        dimensions: 384
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.warn('Could not generate embedding:', error.message);
    return null;
  }
}

// ============================================================================
// PROJECT CODE HELPERS
// ============================================================================

function normalizeProjectCode(code) {
  if (!code) return null;

  // Handle common shortcuts
  const shortcuts = {
    'harvest': 'ACT-HV',
    'hv': 'ACT-HV',
    'justicehub': 'ACT-JH',
    'jh': 'ACT-JH',
    'goods': 'ACT-GD',
    'gd': 'ACT-GD',
    'farm': 'ACT-FM',
    'fm': 'ACT-FM',
    'el': 'ACT-EL',
    'empathy': 'ACT-EL',
    'picc': 'ACT-PC',
    'pc': 'ACT-PC'
  };

  const lower = code.toLowerCase();
  if (shortcuts[lower]) return shortcuts[lower];

  // Add ACT- prefix if missing
  if (!code.toUpperCase().startsWith('ACT-')) {
    return `ACT-${code.toUpperCase()}`;
  }

  return code.toUpperCase();
}

function getProjectName(code) {
  const normalized = normalizeProjectCode(code);
  return PROJECT_CODES.projects?.[normalized]?.name || null;
}

// ============================================================================
// KNOWLEDGE CAPTURE
// ============================================================================

async function captureKnowledge({
  projectCode,
  knowledgeType,
  title,
  content,
  sourceType = 'manual',
  sourceRef = null,
  sourceUrl = null,
  participants = [],
  importance = 'normal',
  actionRequired = false,
  actionItems = null,
  followUpDate = null,
  decisionStatus = null,
  decisionRationale = null,
  recordedAt = null
}) {
  if (!supabase) {
    console.error('Database connection required. Check SUPABASE_SERVICE_ROLE_KEY.');
    return null;
  }

  const normalizedCode = normalizeProjectCode(projectCode);
  if (!normalizedCode) {
    console.error('Project code is required');
    return null;
  }

  // Generate embedding from title + content
  const textForEmbedding = [title, content].filter(Boolean).join(' ');
  const embedding = await generateEmbedding(textForEmbedding);

  // Auto-extract topics from content
  const topics = extractTopics(content);

  const record = {
    project_code: normalizedCode,
    project_name: getProjectName(normalizedCode),
    knowledge_type: knowledgeType,
    title,
    content,
    source_type: sourceType,
    source_ref: sourceRef,
    source_url: sourceUrl,
    participants: participants.length > 0 ? participants : null,
    importance,
    action_required: actionRequired,
    action_items: actionItems,
    follow_up_date: followUpDate,
    decision_status: decisionStatus,
    decision_rationale: decisionRationale,
    topics: topics.length > 0 ? topics : null,
    embedding,
    recorded_at: recordedAt || new Date().toISOString(),
    recorded_by: 'ben'
  };

  const { data, error } = await supabase
    .from('project_knowledge')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to capture knowledge:', error.message);
    return null;
  }

  return data;
}

// Simple topic extraction
function extractTopics(content) {
  if (!content) return [];

  const topics = [];
  const lower = content.toLowerCase();

  // Common topic patterns
  const patterns = {
    'funding': /\b(funding|grant|budget|cost|investment)\b/,
    'legal': /\b(contract|legal|lease|agreement|lawyer)\b/,
    'meeting': /\b(meeting|call|conversation|discussed)\b/,
    'decision': /\b(decided|decision|choose|option)\b/,
    'timeline': /\b(timeline|deadline|week|month|date)\b/,
    'risk': /\b(risk|concern|worry|problem|issue)\b/,
    'opportunity': /\b(opportunity|potential|possible|could)\b/,
    'relationship': /\b(relationship|partner|collaboration)\b/,
    'indigenous': /\b(indigenous|first nations|jinibara|elder|traditional)\b/,
    'community': /\b(community|local|witta|hinterland)\b/
  };

  for (const [topic, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower)) {
      topics.push(topic);
    }
  }

  return topics;
}

// ============================================================================
// CAPTURE SHORTCUTS
// ============================================================================

async function captureReflection(projectCode, reflection, options = {}) {
  console.log(`\n💭 Capturing reflection for ${normalizeProjectCode(projectCode)}...`);

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'reflection',
    title: options.title || reflection.slice(0, 60) + (reflection.length > 60 ? '...' : ''),
    content: reflection,
    importance: options.importance || 'normal',
    participants: options.participants || []
  });

  if (result) {
    console.log(`✓ Reflection captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureDecision(projectCode, decision, rationale, options = {}) {
  console.log(`\n⚖️ Capturing decision for ${normalizeProjectCode(projectCode)}...`);

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'decision',
    title: decision,
    content: rationale || decision,
    decisionStatus: options.status || 'decided',
    decisionRationale: rationale,
    importance: options.importance || 'high',
    participants: options.participants || []
  });

  if (result) {
    console.log(`✓ Decision captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureMeeting(projectCode, notionUrl, title, options = {}) {
  console.log(`\n📅 Capturing meeting for ${normalizeProjectCode(projectCode)}...`);

  // Extract Notion page ID if URL provided
  const pageIdMatch = notionUrl?.match(/([a-f0-9]{32})/);
  const pageId = pageIdMatch ? pageIdMatch[1] : null;

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'meeting',
    title: title || 'Meeting notes',
    content: options.summary || `Meeting notes linked from Notion`,
    sourceType: 'notion',
    sourceRef: pageId,
    sourceUrl: notionUrl,
    participants: options.participants || [],
    actionRequired: options.actionItems?.length > 0,
    actionItems: options.actionItems
  });

  if (result) {
    console.log(`✓ Meeting captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureDocument(projectCode, filePath, options = {}) {
  console.log(`\n📄 Capturing document for ${normalizeProjectCode(projectCode)}...`);

  // Resolve and check file
  const resolvedPath = resolve(filePath);
  const exists = existsSync(resolvedPath);

  let content = options.summary;
  if (!content && exists && filePath.endsWith('.md')) {
    // Try to extract first paragraph as summary
    try {
      const fileContent = readFileSync(resolvedPath, 'utf8');
      const lines = fileContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      content = lines.slice(0, 3).join(' ').slice(0, 500);
    } catch (e) {
      content = `Document: ${filePath}`;
    }
  }

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'document',
    title: options.title || filePath.split('/').pop(),
    content: content || `Document reference: ${filePath}`,
    sourceType: 'file',
    sourceRef: filePath,
    importance: options.importance || 'normal'
  });

  if (result) {
    console.log(`✓ Document captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureEvent(projectCode, event, options = {}) {
  console.log(`\n📌 Capturing event for ${normalizeProjectCode(projectCode)}...`);

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'event',
    title: event.slice(0, 100),
    content: event,
    recordedAt: options.date || new Date().toISOString(),
    participants: options.participants || [],
    importance: options.importance || 'normal'
  });

  if (result) {
    console.log(`✓ Event captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureQuestion(projectCode, question, options = {}) {
  console.log(`\n❓ Capturing question for ${normalizeProjectCode(projectCode)}...`);

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'question',
    title: question,
    content: options.context || question,
    actionRequired: true,
    followUpDate: options.followUpDate,
    importance: options.importance || 'normal'
  });

  if (result) {
    console.log(`✓ Question captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

async function captureLink(projectCode, url, title, options = {}) {
  console.log(`\n🔗 Capturing link for ${normalizeProjectCode(projectCode)}...`);

  const result = await captureKnowledge({
    projectCode,
    knowledgeType: 'link',
    title: title || url,
    content: options.description || `External resource: ${url}`,
    sourceType: 'url',
    sourceUrl: url,
    importance: options.importance || 'low'
  });

  if (result) {
    console.log(`✓ Link captured (ID: ${result.id.slice(0, 8)})`);
  }
  return result;
}

// ============================================================================
// INTERACTIVE MODE
// ============================================================================

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📚 Project Knowledge Capture');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Project selection
  const projectCode = await ask('Project code (e.g., ACT-HV, harvest, jh): ');
  const normalized = normalizeProjectCode(projectCode);
  const projectName = getProjectName(normalized);
  console.log(`→ ${normalized}${projectName ? ` - ${projectName}` : ''}\n`);

  // Type selection
  console.log('Knowledge type:');
  console.log('  1. 💭 Reflection (quick thought)');
  console.log('  2. ⚖️ Decision');
  console.log('  3. 📅 Meeting link');
  console.log('  4. 📄 Document');
  console.log('  5. 📌 Event');
  console.log('  6. ❓ Question');
  console.log('  7. 🔗 Link\n');

  const typeChoice = await ask('Choose type (1-7): ');

  const types = {
    '1': 'reflection',
    '2': 'decision',
    '3': 'meeting',
    '4': 'document',
    '5': 'event',
    '6': 'question',
    '7': 'link'
  };

  const knowledgeType = types[typeChoice] || 'reflection';

  // Type-specific capture
  let result;

  switch (knowledgeType) {
    case 'reflection':
      const reflection = await ask('\nYour reflection:\n> ');
      result = await captureReflection(normalized, reflection);
      break;

    case 'decision':
      const decision = await ask('\nDecision made:\n> ');
      const rationale = await ask('Rationale (why):\n> ');
      result = await captureDecision(normalized, decision, rationale);
      break;

    case 'meeting':
      const notionUrl = await ask('\nNotion URL:\n> ');
      const meetingTitle = await ask('Meeting title:\n> ');
      const meetingSummary = await ask('Quick summary (optional):\n> ');
      result = await captureMeeting(normalized, notionUrl, meetingTitle, {
        summary: meetingSummary || undefined
      });
      break;

    case 'document':
      const filePath = await ask('\nFile path:\n> ');
      const docTitle = await ask('Document title (optional):\n> ');
      result = await captureDocument(normalized, filePath, {
        title: docTitle || undefined
      });
      break;

    case 'event':
      const event = await ask('\nWhat happened:\n> ');
      result = await captureEvent(normalized, event);
      break;

    case 'question':
      const question = await ask('\nOpen question:\n> ');
      result = await captureQuestion(normalized, question);
      break;

    case 'link':
      const url = await ask('\nURL:\n> ');
      const linkTitle = await ask('Title:\n> ');
      const description = await ask('Description (optional):\n> ');
      result = await captureLink(normalized, url, linkTitle, {
        description: description || undefined
      });
      break;
  }

  rl.close();

  if (result) {
    console.log('\n✅ Knowledge captured successfully!\n');
  }
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    project: null,
    reflection: null,
    decision: null,
    rationale: null,
    meeting: null,
    document: null,
    event: null,
    question: null,
    link: null,
    title: null,
    participants: [],
    importance: 'normal',
    interactive: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
    } else if (arg === '--reflection' || arg === '-r') {
      options.reflection = args[++i];
    } else if (arg === '--decision' || arg === '-d') {
      options.decision = args[++i];
    } else if (arg === '--rationale') {
      options.rationale = args[++i];
    } else if (arg === '--meeting' || arg === '-m') {
      options.meeting = args[++i];
    } else if (arg === '--document' || arg === '--doc') {
      options.document = args[++i];
    } else if (arg === '--event' || arg === '-e') {
      options.event = args[++i];
    } else if (arg === '--question' || arg === '-q') {
      options.question = args[++i];
    } else if (arg === '--link' || arg === '-l') {
      options.link = args[++i];
    } else if (arg === '--title' || arg === '-t') {
      options.title = args[++i];
    } else if (arg === '--participants') {
      options.participants = args[++i].split(',').map(p => p.trim());
    } else if (arg === '--importance') {
      options.importance = args[++i];
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
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
Project Knowledge Capture

Usage:
  node scripts/capture-knowledge.mjs [options]

Options:
  --project, -p <code>    Project code (e.g., ACT-HV, harvest)
  --reflection, -r <text> Quick thought or insight
  --decision, -d <text>   Decision made
  --rationale <text>      Why the decision was made
  --meeting, -m <url>     Notion meeting URL
  --document <path>       Local document path
  --event, -e <text>      Something that happened
  --question, -q <text>   Open question to resolve
  --link, -l <url>        External resource URL
  --title, -t <text>      Title for meeting/document/link
  --participants <names>  Comma-separated names
  --importance <level>    critical, high, normal, low
  --interactive, -i       Interactive mode
  --help, -h              Show this help

Examples:
  # Quick reflection
  node scripts/capture-knowledge.mjs -p harvest -r "Grant seems open to protection"

  # Decision with rationale
  node scripts/capture-knowledge.mjs -p ACT-HV -d "Proceed with caution" --rationale "Joy high but score 2.2/5"

  # Meeting link
  node scripts/capture-knowledge.mjs -p harvest --meeting "https://notion.so/..." -t "Grant call"

  # Document reference
  node scripts/capture-knowledge.mjs -p ACT-HV --doc "docs/strategy/the-harvest-decision-strategic-advice.md"

  # Interactive mode
  node scripts/capture-knowledge.mjs -i

Project Shortcuts:
  harvest, hv  → ACT-HV (The Harvest)
  justicehub, jh → ACT-JH (JusticeHub)
  goods, gd    → ACT-GD (Goods)
  farm, fm     → ACT-FM (ACT Farm)
  el, empathy  → ACT-EL (Empathy Ledger)
  picc, pc     → ACT-PC (PICC)
`);
    return;
  }

  if (options.interactive) {
    await interactiveMode();
    return;
  }

  if (!options.project) {
    console.error('Project code required. Use --project or -p');
    process.exit(1);
  }

  // Process based on type
  if (options.reflection) {
    await captureReflection(options.project, options.reflection, {
      importance: options.importance
    });
  } else if (options.decision) {
    await captureDecision(options.project, options.decision, options.rationale, {
      importance: options.importance
    });
  } else if (options.meeting) {
    await captureMeeting(options.project, options.meeting, options.title, {
      participants: options.participants
    });
  } else if (options.document) {
    await captureDocument(options.project, options.document, {
      title: options.title,
      importance: options.importance
    });
  } else if (options.event) {
    await captureEvent(options.project, options.event, {
      participants: options.participants,
      importance: options.importance
    });
  } else if (options.question) {
    await captureQuestion(options.project, options.question, {
      importance: options.importance
    });
  } else if (options.link) {
    await captureLink(options.project, options.link, options.title, {
      importance: options.importance
    });
  } else {
    console.log('No content provided. Use --reflection, --decision, --meeting, etc.');
    console.log('Or use --interactive for guided capture.');
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

// Export for programmatic use
export {
  captureKnowledge,
  captureReflection,
  captureDecision,
  captureMeeting,
  captureDocument,
  captureEvent,
  captureQuestion,
  captureLink,
  normalizeProjectCode,
  getProjectName
};
