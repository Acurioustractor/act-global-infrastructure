#!/usr/bin/env node
/**
 * Unified Cross-Source Search
 * Layer 4: Indexing & Retrieval
 *
 * Searches across all ACT data sources:
 * - Voice notes (semantic)
 * - Knowledge base (semantic)
 * - Contacts (text + relationship)
 * - Projects (tags + codes)
 * - Communications (text)
 *
 * Usage:
 *   node scripts/unified-search.mjs "search query"
 *   node scripts/unified-search.mjs --source voice "meeting notes"
 *   node scripts/unified-search.mjs --json "query"  # Output as JSON
 */

import { createClient } from '@supabase/supabase-js';
import { cachedEmbedding } from './lib/cache.mjs';
import { createAuditor } from './lib/audit.mjs';

// Initialize (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const audit = createAuditor('unified-search', { userContext: 'cli' });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEARCH FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search voice notes using semantic similarity
 */
async function searchVoiceNotes(embedding, options = {}) {
  const limit = options.limit || 5;
  const threshold = options.threshold || 0.7;

  try {
    const { data, error } = await supabase.rpc('search_voice_notes', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.warn('Voice notes search error:', error.message);
      return [];
    }

    return (data || []).map(d => ({
      type: 'voice_note',
      id: d.id,
      title: d.summary || 'Voice Note',
      snippet: d.transcript?.substring(0, 200) + '...',
      score: d.similarity,
      metadata: {
        recordedBy: d.recorded_by_name,
        recordedAt: d.recorded_at,
        topics: d.topics
      }
    }));
  } catch (err) {
    console.warn('Voice notes search failed:', err.message);
    return [];
  }
}

/**
 * Search knowledge base using semantic similarity
 */
async function searchKnowledge(embedding, options = {}) {
  const limit = options.limit || 5;
  const threshold = options.threshold || 0.7;

  try {
    // Check if knowledge_base table exists
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content, category, embedding')
      .limit(100);

    if (error) {
      if (error.message.includes('does not exist')) {
        return [];  // Table doesn't exist yet
      }
      throw error;
    }

    // Manual similarity calculation (if no RPC function)
    const results = [];
    for (const item of data || []) {
      if (!item.embedding) continue;

      const similarity = cosineSimilarity(embedding, item.embedding);
      if (similarity >= threshold) {
        results.push({
          type: 'knowledge',
          id: item.id,
          title: item.title,
          snippet: item.content?.substring(0, 200) + '...',
          score: similarity,
          metadata: {
            category: item.category
          }
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (err) {
    console.warn('Knowledge search failed:', err.message);
    return [];
  }
}

/**
 * Search contacts using text matching
 */
async function searchContacts(query, options = {}) {
  const limit = options.limit || 5;
  const queryLower = query.toLowerCase();

  try {
    // Try canonical entities first
    let { data, error } = await supabase
      .from('canonical_entities')
      .select('*')
      .eq('entity_type', 'person')
      .or(`canonical_name.ilike.%${query}%,canonical_email.ilike.%${query}%,canonical_company.ilike.%${query}%`)
      .limit(limit);

    if (error || !data?.length) {
      // Fall back to ghl_contacts
      const { data: ghlData, error: ghlError } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, phone, company_name, tags')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(limit);

      if (ghlError) throw ghlError;
      data = ghlData?.map(c => ({
        id: c.ghl_id,
        canonical_name: c.full_name,
        canonical_email: c.email,
        canonical_phone: c.phone,
        canonical_company: c.company_name,
        tags: c.tags
      }));
    }

    return (data || []).map(c => {
      // Calculate relevance score
      let score = 0.5;
      if (c.canonical_name?.toLowerCase().includes(queryLower)) score += 0.3;
      if (c.canonical_email?.toLowerCase().includes(queryLower)) score += 0.2;

      return {
        type: 'contact',
        id: c.id,
        title: c.canonical_name,
        snippet: `${c.canonical_email || ''} | ${c.canonical_company || ''}`,
        score,
        metadata: {
          email: c.canonical_email,
          phone: c.canonical_phone,
          company: c.canonical_company
        }
      };
    });
  } catch (err) {
    console.warn('Contact search failed:', err.message);
    return [];
  }
}

/**
 * Search projects by name, code, or tags
 */
async function searchProjects(query, options = {}) {
  const limit = options.limit || 5;
  const queryLower = query.toLowerCase();

  try {
    // Search project codes config
    const projectCodes = await loadProjectCodes();

    const results = [];
    for (const [code, project] of Object.entries(projectCodes)) {
      const name = project.name || code;
      const tags = project.tags || [];

      let score = 0;
      if (code.toLowerCase().includes(queryLower)) score += 0.4;
      if (name.toLowerCase().includes(queryLower)) score += 0.4;
      if (tags.some(t => t.toLowerCase().includes(queryLower))) score += 0.2;

      if (score > 0) {
        results.push({
          type: 'project',
          id: code,
          title: name,
          snippet: `Code: ${code} | Tags: ${tags.join(', ')}`,
          score,
          metadata: {
            code,
            tags,
            lcaa: project.lcaa,
            status: project.status
          }
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (err) {
    console.warn('Project search failed:', err.message);
    return [];
  }
}

/**
 * Search communications history
 */
async function searchCommunications(query, options = {}) {
  const limit = options.limit || 5;

  try {
    const { data, error } = await supabase
      .from('communications_history')
      .select('id, channel, direction, subject, content_preview, contact_name, occurred_at')
      .or(`subject.ilike.%${query}%,content_preview.ilike.%${query}%,contact_name.ilike.%${query}%`)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(c => ({
      type: 'communication',
      id: c.id,
      title: c.subject || `${c.channel} with ${c.contact_name}`,
      snippet: c.content_preview || '',
      score: 0.6,
      metadata: {
        channel: c.channel,
        direction: c.direction,
        contactName: c.contact_name,
        occurredAt: c.occurred_at
      }
    }));
  } catch (err) {
    console.warn('Communications search failed:', err.message);
    return [];
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIFIED SEARCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search across all sources
 */
export async function unifiedSearch(query, options = {}) {
  const sources = options.sources || ['voice', 'knowledge', 'contacts', 'projects', 'communications'];
  const limit = options.limit || 10;

  // Generate embedding for semantic search
  const embedding = await cachedEmbedding(query, 'unified-search');

  // Run searches in parallel
  const searchPromises = [];

  if (sources.includes('voice')) {
    searchPromises.push(searchVoiceNotes(embedding, options).catch(() => []));
  }
  if (sources.includes('knowledge')) {
    searchPromises.push(searchKnowledge(embedding, options).catch(() => []));
  }
  if (sources.includes('contacts')) {
    searchPromises.push(searchContacts(query, options).catch(() => []));
  }
  if (sources.includes('projects')) {
    searchPromises.push(searchProjects(query, options).catch(() => []));
  }
  if (sources.includes('communications')) {
    searchPromises.push(searchCommunications(query, options).catch(() => []));
  }

  const results = await Promise.all(searchPromises);

  // Flatten and rank
  const allResults = results.flat();

  // Apply cross-source ranking adjustments
  const ranked = rankResults(allResults, query);

  return ranked.slice(0, limit);
}

/**
 * Rank and merge results from different sources
 */
function rankResults(results, query) {
  // Source weights
  const sourceWeights = {
    voice_note: 1.1,    // Boost voice notes
    knowledge: 1.0,
    contact: 0.9,
    project: 0.9,
    communication: 0.8
  };

  // Apply weights
  const weighted = results.map(r => ({
    ...r,
    weightedScore: r.score * (sourceWeights[r.type] || 1)
  }));

  // Sort by weighted score
  weighted.sort((a, b) => b.weightedScore - a.weightedScore);

  // Remove duplicates (same title)
  const seen = new Set();
  const unique = [];

  for (const result of weighted) {
    const key = `${result.type}:${result.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    }
  }

  return unique;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

async function loadProjectCodes() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'config', 'project-codes.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Parse arguments
const args = process.argv.slice(2);
let query = '';
let source = null;
let jsonOutput = false;
let limit = 10;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source' && args[i + 1]) {
    source = args[++i];
  } else if (args[i] === '--json') {
    jsonOutput = true;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[++i]);
  } else if (!args[i].startsWith('--')) {
    query = args[i];
  }
}

if (!query) {
  console.log('Unified Search - Cross-Source ACT Search');
  console.log('━'.repeat(40));
  console.log('\nUsage:');
  console.log('  node scripts/unified-search.mjs "search query"');
  console.log('  node scripts/unified-search.mjs --source voice "meeting notes"');
  console.log('  node scripts/unified-search.mjs --source contacts "kristy"');
  console.log('  node scripts/unified-search.mjs --json "query"');
  console.log('  node scripts/unified-search.mjs --limit 20 "query"');
  console.log('\nSources: voice, knowledge, contacts, projects, communications');
  process.exit(0);
}

// Execute search
await audit.action('search', 'unified', async () => {
  const options = {
    limit,
    sources: source ? [source] : undefined
  };

  const results = await unifiedSearch(query, options);

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return results;
  }

  // Pretty print
  console.log(`\nSearch: "${query}"`);
  if (source) console.log(`Source: ${source}`);
  console.log('━'.repeat(50));

  if (results.length === 0) {
    console.log('No results found.');
    return results;
  }

  results.forEach((r, i) => {
    const typeIcon = {
      voice_note: '🎤',
      knowledge: '📚',
      contact: '👤',
      project: '📁',
      communication: '💬'
    }[r.type] || '📄';

    console.log(`\n${i + 1}. ${typeIcon} ${r.title}`);
    console.log(`   Type: ${r.type} | Score: ${(r.score * 100).toFixed(0)}%`);
    if (r.snippet) {
      console.log(`   ${r.snippet.substring(0, 100)}${r.snippet.length > 100 ? '...' : ''}`);
    }
  });

  console.log(`\n━━━ ${results.length} results ━━━`);

  return results;
}, { inputSummary: { query, source, limit } });

export default { unifiedSearch };
