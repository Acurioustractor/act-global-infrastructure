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
import { MemoryLifecycle } from './lib/memory-lifecycle.mjs';

// Initialize (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const audit = createAuditor('unified-search', { userContext: 'cli' });
const memoryLifecycle = new MemoryLifecycle();

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
// FINANCE SEARCH FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search Xero transactions (bank feed)
 */
async function searchXeroTransactions(query, options = {}) {
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();

  try {
    // Build query - search by contact name or project code
    let dbQuery = supabase
      .from('xero_transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    // If query looks like a project code (ACT-XX), search by project_code
    if (query.match(/^ACT-[A-Z]{2}$/i)) {
      dbQuery = dbQuery.ilike('project_code', `%${query}%`);
    } else {
      dbQuery = dbQuery.or(`contact_name.ilike.%${query}%,project_code.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;
    if (error) throw error;

    return (data || []).slice(0, limit).map(t => {
      let score = 0.5;
      if (t.contact_name?.toLowerCase().includes(queryLower)) score += 0.3;
      if (t.project_code?.toLowerCase().includes(queryLower)) score += 0.2;

      return {
        type: 'xero_transaction',
        id: t.xero_transaction_id,
        title: t.contact_name || 'Unknown Contact',
        snippet: `$${Math.abs(t.total || 0).toFixed(2)} | ${t.date} | ${t.project_code || 'No project'}`,
        score,
        metadata: {
          amount: t.total,
          date: t.date,
          projectCode: t.project_code,
          bankAccount: t.bank_account,
          hasAttachments: t.has_attachments,
          type: t.type,
          status: t.status
        }
      };
    });
  } catch (err) {
    console.warn('Xero transactions search failed:', err.message);
    return [];
  }
}

/**
 * Search Xero invoices (bills from Dext)
 */
async function searchXeroInvoices(query, options = {}) {
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();

  try {
    let dbQuery = supabase
      .from('xero_invoices')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    // Search by contact name or reference
    dbQuery = dbQuery.or(`contact_name.ilike.%${query}%,reference.ilike.%${query}%,invoice_number.ilike.%${query}%`);

    const { data, error } = await dbQuery;
    if (error) throw error;

    return (data || []).slice(0, limit).map(inv => {
      let score = 0.5;
      if (inv.contact_name?.toLowerCase().includes(queryLower)) score += 0.3;
      if (inv.reference?.toLowerCase().includes(queryLower)) score += 0.2;

      return {
        type: 'xero_invoice',
        id: inv.invoice_id,
        title: `${inv.contact_name || 'Unknown'} - ${inv.invoice_number || 'No #'}`,
        snippet: `$${Math.abs(inv.total || 0).toFixed(2)} | ${inv.date} | ${inv.status}`,
        score,
        metadata: {
          invoiceNumber: inv.invoice_number,
          amount: inv.total,
          date: inv.date,
          dueDate: inv.due_date,
          status: inv.status,
          hasAttachments: inv.has_attachments,
          type: inv.type
        }
      };
    });
  } catch (err) {
    console.warn('Xero invoices search failed:', err.message);
    return [];
  }
}

/**
 * Search receipt matches (pending/unmatched receipts)
 */
async function searchReceiptMatches(query, options = {}) {
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();

  try {
    let dbQuery = supabase
      .from('receipt_matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Search by vendor name, category, or description
    dbQuery = dbQuery.or(`vendor_name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`);

    const { data, error } = await dbQuery;
    if (error) throw error;

    return (data || []).slice(0, limit).map(r => {
      let score = 0.5;
      if (r.vendor_name?.toLowerCase().includes(queryLower)) score += 0.3;
      if (r.category?.toLowerCase().includes(queryLower)) score += 0.2;

      const statusEmoji = r.status === 'resolved' ? '✅' : r.status === 'pending' ? '⏳' : '❓';

      return {
        type: 'receipt_match',
        id: r.id,
        title: `${statusEmoji} ${r.vendor_name || 'Unknown Vendor'}`,
        snippet: `$${Math.abs(r.amount || 0).toFixed(2)} | ${r.transaction_date} | ${r.status}`,
        score,
        metadata: {
          amount: r.amount,
          date: r.transaction_date,
          status: r.status,
          category: r.category,
          sourceType: r.source_type,
          sourceId: r.source_id,
          matchConfidence: r.match_confidence
        }
      };
    });
  } catch (err) {
    console.warn('Receipt matches search failed:', err.message);
    return [];
  }
}

/**
 * Search GHL opportunities (grants/funding)
 */
async function searchGHLOpportunities(query, options = {}) {
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();

  try {
    let dbQuery = supabase
      .from('ghl_opportunities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Search by name, pipeline name, or stage name
    dbQuery = dbQuery.or(`name.ilike.%${query}%,pipeline_name.ilike.%${query}%,stage_name.ilike.%${query}%`);

    const { data, error } = await dbQuery;
    if (error) throw error;

    return (data || []).slice(0, limit).map(opp => {
      let score = 0.5;
      if (opp.name?.toLowerCase().includes(queryLower)) score += 0.3;
      if (opp.pipeline_name?.toLowerCase().includes(queryLower)) score += 0.2;

      const stageEmoji = {
        'Approved': '✅',
        'Received': '💰',
        'Submitted': '📤',
        'Research': '🔍',
        'Preparing': '📝'
      }[opp.stage_name] || '📋';

      return {
        type: 'ghl_opportunity',
        id: opp.ghl_id,
        title: `${stageEmoji} ${opp.name || 'Unnamed Opportunity'}`,
        snippet: `$${(opp.monetary_value || 0).toLocaleString()} | ${opp.stage_name} | ${opp.pipeline_name}`,
        score,
        metadata: {
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          contactId: opp.ghl_contact_id,
          status: opp.status,
          assignedTo: opp.assigned_to
        }
      };
    });
  } catch (err) {
    console.warn('GHL opportunities search failed:', err.message);
    return [];
  }
}

/**
 * Search by project code across all finance sources
 */
async function searchByProjectCode(projectCode, options = {}) {
  const limit = options.limit || 20;
  const results = [];

  // Load project info
  const projectCodes = await loadProjectCodes();
  const project = projectCodes.projects?.[projectCode.toUpperCase()];

  if (project) {
    results.push({
      type: 'project_info',
      id: projectCode,
      title: `📁 ${project.name} (${projectCode})`,
      snippet: `${project.description} | Category: ${project.category}`,
      score: 1.0,
      metadata: {
        code: projectCode,
        name: project.name,
        category: project.category,
        xeroTracking: project.xero_tracking,
        dextCategory: project.dext_category,
        ghlTags: project.ghl_tags
      }
    });
  }

  // Search Xero transactions by reference
  const xeroTxns = await searchXeroTransactions(projectCode, { limit: 5 });
  results.push(...xeroTxns);

  // Search Xero invoices
  const xeroInvs = await searchXeroInvoices(projectCode, { limit: 5 });
  results.push(...xeroInvs);

  // Search receipt matches
  const receipts = await searchReceiptMatches(projectCode, { limit: 5 });
  results.push(...receipts);

  // Search GHL opportunities by name/tags
  if (project?.ghl_tags) {
    for (const tag of project.ghl_tags.slice(0, 2)) {
      const opps = await searchGHLOpportunities(tag, { limit: 3 });
      results.push(...opps);
    }
  }

  return results.slice(0, limit);
}

/**
 * List all project codes with summary
 */
async function listProjectCodes() {
  const projectCodes = await loadProjectCodes();
  const projects = projectCodes.projects || {};
  const categories = projectCodes.categories || {};

  const summary = [];
  for (const [code, project] of Object.entries(projects)) {
    const cat = categories[project.category] || {};
    summary.push({
      code,
      name: project.name,
      category: project.category,
      icon: cat.icon || '📁',
      status: project.status,
      xero: project.xero_tracking,
      dext: project.dext_category
    });
  }

  return summary.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get project summary with financial data
 */
async function getProjectSummary(projectCode) {
  const projectCodes = await loadProjectCodes();
  const project = projectCodes.projects?.[projectCode.toUpperCase()];

  if (!project) {
    return { error: `Project ${projectCode} not found` };
  }

  // Get financial data
  const [transactions, invoices, receipts] = await Promise.all([
    searchXeroTransactions(projectCode, { limit: 100 }),
    searchXeroInvoices(projectCode, { limit: 100 }),
    searchReceiptMatches(projectCode, { limit: 100 })
  ]);

  const totalExpenses = transactions
    .filter(t => t.metadata.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.metadata.amount), 0);

  const totalInvoices = invoices
    .reduce((sum, i) => sum + Math.abs(i.metadata.amount || 0), 0);

  const pendingReceipts = receipts
    .filter(r => r.metadata.status === 'pending');

  return {
    project: {
      code: projectCode,
      name: project.name,
      category: project.category,
      description: project.description
    },
    financial: {
      totalExpenses,
      totalInvoices,
      transactionCount: transactions.length,
      invoiceCount: invoices.length,
      pendingReceiptsCount: pendingReceipts.length,
      pendingReceiptsValue: pendingReceipts.reduce((sum, r) => sum + Math.abs(r.metadata.amount || 0), 0)
    },
    mappings: {
      xero: project.xero_tracking,
      dext: project.dext_category,
      ghlTags: project.ghl_tags
    }
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HYBRID MEMORY SEARCH (Phase 4: vector + graph + decay)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Search knowledge using hybrid retrieval (vector + graph + freshness)
 */
async function searchMemoryHybrid(embedding, options = {}) {
  const limit = options.limit || 10;
  const threshold = options.threshold || 0.25;

  try {
    const { data, error } = await supabase.rpc('hybrid_memory_search', {
      query_embedding: embedding,
      p_project_code: options.projectCode || null,
      p_entity_id: options.entityId || null,
      p_include_episodes: true,
      p_freshness_weight: 0.2,
      p_graph_weight: 0.2,
      p_vector_weight: 0.6,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      // Fall back to legacy searchKnowledge if hybrid function not yet deployed
      if (error.message?.includes('does not exist')) {
        return searchKnowledge(embedding, options);
      }
      console.warn('Hybrid memory search error:', error.message);
      return [];
    }

    // Record access for returned results
    const accessItems = (data || []).map(d => ({
      table: d.source_table,
      id: d.source_id
    }));
    memoryLifecycle.recordBatchAccess(accessItems).catch(() => {});

    return (data || []).map(d => ({
      type: d.source_table === 'project_knowledge' ? 'knowledge' : 'knowledge_chunk',
      id: d.source_id,
      title: d.title || 'Knowledge',
      snippet: d.content?.substring(0, 200) + '...',
      score: d.combined_score,
      metadata: {
        vectorScore: d.vector_score,
        decayScore: d.decay_score,
        graphScore: d.graph_score,
        sourceTable: d.source_table,
        ...d.metadata
      }
    }));
  } catch (err) {
    console.warn('Hybrid memory search failed:', err.message);
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
  const defaultSources = ['voice', 'knowledge', 'contacts', 'projects', 'communications', 'xero', 'invoices', 'receipts', 'grants'];
  const sources = options.sources || defaultSources;
  const limit = options.limit || 10;

  // Generate embedding for semantic search (only if needed)
  let embedding = null;
  if (sources.includes('voice') || sources.includes('knowledge')) {
    try {
      embedding = await cachedEmbedding(query, 'unified-search');
    } catch (err) {
      console.warn('Embedding generation failed, skipping semantic search:', err.message);
    }
  }

  // Run searches in parallel
  const searchPromises = [];

  if (sources.includes('voice') && embedding) {
    searchPromises.push(searchVoiceNotes(embedding, options).catch(() => []));
  }
  if (sources.includes('knowledge') && embedding) {
    searchPromises.push(searchMemoryHybrid(embedding, options).catch(() => []));
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
  // Finance sources
  if (sources.includes('xero')) {
    searchPromises.push(searchXeroTransactions(query, options).catch(() => []));
  }
  if (sources.includes('invoices')) {
    searchPromises.push(searchXeroInvoices(query, options).catch(() => []));
  }
  if (sources.includes('receipts')) {
    searchPromises.push(searchReceiptMatches(query, options).catch(() => []));
  }
  if (sources.includes('grants')) {
    searchPromises.push(searchGHLOpportunities(query, options).catch(() => []));
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
    knowledge_chunk: 0.9,
    contact: 0.9,
    project: 0.9,
    project_info: 1.2,  // Boost exact project matches
    communication: 0.8,
    // Finance sources
    xero_transaction: 0.85,
    xero_invoice: 0.85,
    receipt_match: 0.9,
    ghl_opportunity: 0.95  // Boost grants/opportunities
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
let projectCode = null;
let command = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source' && args[i + 1]) {
    source = args[++i];
  } else if (args[i] === '--json') {
    jsonOutput = true;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[++i]);
  } else if (args[i] === '--project' && args[i + 1]) {
    projectCode = args[++i];
  } else if (args[i] === 'list-codes' || args[i] === 'codes') {
    command = 'list-codes';
  } else if (args[i] === 'project-summary' && args[i + 1]) {
    command = 'project-summary';
    projectCode = args[++i];
  } else if (args[i] === 'finance' && args[i + 1]) {
    command = 'finance';
    query = args[++i];
  } else if (!args[i].startsWith('--')) {
    query = args[i];
  }
}

// Handle special commands
if (command === 'list-codes') {
  const codes = await listProjectCodes();
  if (jsonOutput) {
    console.log(JSON.stringify(codes, null, 2));
  } else {
    console.log('\nACT Project Codes');
    console.log('━'.repeat(60));
    console.log('Code     | Name                          | Category     | Xero');
    console.log('━'.repeat(60));
    for (const p of codes) {
      const name = (p.name || '').substring(0, 28).padEnd(28);
      const cat = (p.category || '').padEnd(12);
      const xero = (p.xero || '').substring(0, 15);
      console.log(`${p.icon} ${p.code} | ${name} | ${cat} | ${xero}`);
    }
    console.log('━'.repeat(60));
    console.log(`Total: ${codes.length} projects`);
  }
  process.exit(0);
}

if (command === 'project-summary' && projectCode) {
  const summary = await getProjectSummary(projectCode);
  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (summary.error) {
    console.log(`Error: ${summary.error}`);
  } else {
    console.log(`\n📁 ${summary.project.name} (${summary.project.code})`);
    console.log('━'.repeat(50));
    console.log(`Category: ${summary.project.category}`);
    console.log(`Description: ${summary.project.description}`);
    console.log('\n💰 Financial Summary:');
    console.log(`   Transactions: ${summary.financial.transactionCount}`);
    console.log(`   Total Expenses: $${summary.financial.totalExpenses.toFixed(2)}`);
    console.log(`   Invoices: ${summary.financial.invoiceCount}`);
    console.log(`   Total Invoices: $${summary.financial.totalInvoices.toFixed(2)}`);
    console.log(`   Pending Receipts: ${summary.financial.pendingReceiptsCount} ($${summary.financial.pendingReceiptsValue.toFixed(2)})`);
    console.log('\n🔗 System Mappings:');
    console.log(`   Xero Tracking: ${summary.mappings.xero || 'Not set'}`);
    console.log(`   Dext Category: ${summary.mappings.dext || 'Not set'}`);
    console.log(`   GHL Tags: ${summary.mappings.ghlTags?.join(', ') || 'None'}`);
  }
  process.exit(0);
}

if (command === 'finance' && query) {
  // Finance-only search
  source = ['xero', 'invoices', 'receipts', 'grants'];
}

if (!query && !projectCode) {
  console.log('Unified Search - Cross-Source ACT Search');
  console.log('━'.repeat(50));
  console.log('\nUsage:');
  console.log('  node scripts/unified-search.mjs "search query"');
  console.log('  node scripts/unified-search.mjs --source voice "meeting notes"');
  console.log('  node scripts/unified-search.mjs --source contacts "kristy"');
  console.log('  node scripts/unified-search.mjs --source xero "qantas"');
  console.log('  node scripts/unified-search.mjs --source grants "first nations"');
  console.log('  node scripts/unified-search.mjs --project ACT-JH');
  console.log('  node scripts/unified-search.mjs finance "adobe"');
  console.log('  node scripts/unified-search.mjs --json "query"');
  console.log('  node scripts/unified-search.mjs --limit 20 "query"');
  console.log('\nCommands:');
  console.log('  list-codes              List all project codes');
  console.log('  project-summary ACT-XX  Get financial summary for a project');
  console.log('  finance "query"         Search only finance sources');
  console.log('\nSources:');
  console.log('  General: voice, knowledge, contacts, projects, communications');
  console.log('  Finance: xero, invoices, receipts, grants');
  process.exit(0);
}

// Execute search
await audit.action('search', 'unified', async () => {
  // If project code specified, use project search
  if (projectCode && !query) {
    const results = await searchByProjectCode(projectCode, { limit });

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
      return results;
    }

    console.log(`\nProject: ${projectCode.toUpperCase()}`);
    console.log('━'.repeat(50));

    if (results.length === 0) {
      console.log('No results found for this project.');
      return results;
    }

    results.forEach((r, i) => {
      const typeIcon = {
        project_info: '📁',
        xero_transaction: '💳',
        xero_invoice: '📄',
        receipt_match: '🧾',
        ghl_opportunity: '💰'
      }[r.type] || '📄';

      console.log(`\n${i + 1}. ${typeIcon} ${r.title}`);
      console.log(`   Type: ${r.type} | Score: ${(r.score * 100).toFixed(0)}%`);
      if (r.snippet) {
        console.log(`   ${r.snippet}`);
      }
    });

    console.log(`\n━━━ ${results.length} results ━━━`);
    return results;
  }

  // Standard unified search
  const options = {
    limit,
    sources: Array.isArray(source) ? source : (source ? [source] : undefined)
  };

  const results = await unifiedSearch(query, options);

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return results;
  }

  // Pretty print
  console.log(`\nSearch: "${query}"`);
  if (source) console.log(`Source: ${Array.isArray(source) ? source.join(', ') : source}`);
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
      project_info: '📁',
      communication: '💬',
      xero_transaction: '💳',
      xero_invoice: '📄',
      receipt_match: '🧾',
      ghl_opportunity: '💰'
    }[r.type] || '📄';

    console.log(`\n${i + 1}. ${typeIcon} ${r.title}`);
    console.log(`   Type: ${r.type} | Score: ${(r.score * 100).toFixed(0)}%`);
    if (r.snippet) {
      console.log(`   ${r.snippet.substring(0, 100)}${r.snippet.length > 100 ? '...' : ''}`);
    }
  });

  console.log(`\n━━━ ${results.length} results ━━━`);

  return results;
}, { inputSummary: { query, source, limit, projectCode } });

export default {
  unifiedSearch,
  searchByProjectCode,
  listProjectCodes,
  getProjectSummary,
  searchXeroTransactions,
  searchXeroInvoices,
  searchReceiptMatches,
  searchGHLOpportunities
};
