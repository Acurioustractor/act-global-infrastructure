/**
 * ACT Unified RAG Service
 *
 * Combines:
 * - ACT Studio's semantic search (embedding service)
 * - ACT Placemat's multi-provider AI (orchestrator)
 * - Research-backed confidence scoring
 * - Privacy-preserving options (OCAP® compliant)
 *
 * Flow:
 * 1. Generate query embedding
 * 2. Semantic search for relevant knowledge
 * 3. Build context from top matches
 * 4. Generate AI response with citations
 * 5. Return answer + sources + confidence + cost
 */

import { createClient } from '@supabase/supabase-js';
import { embeddingService } from './embedding-service';
import { multiProviderAI, type AnalysisTier, type PrivacyMode } from './multi-provider-ai';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RAGQuery {
  query: string;

  // Search options
  topK?: number;
  minSimilarity?: number;
  filterProject?: string;
  filterType?: string;
  filterPillar?: string;
  filterLCAAPhase?: string;

  // AI options
  tier?: AnalysisTier;
  privacyMode?: PrivacyMode;
  maxTokens?: number;

  // Control flags
  includeContext?: boolean;
  includeSources?: boolean;
  useHybridSearch?: boolean;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  excerpt?: string;
  sourcePath: string;
  sourceProject?: string;
  contentType?: string;
  similarity: number;
  confidence: number;
}

export interface RAGResponse {
  answer: string;
  sources: KnowledgeSource[];

  // Quality metrics
  overallConfidence: number;
  avgSimilarity: number;

  // AI metadata
  provider: string;
  model: string;

  // Cost tracking
  cost: {
    embedding: number;
    generation: number;
    total: number;
  };

  // Performance
  latencyMs: {
    embedding: number;
    search: number;
    generation: number;
    total: number;
  };

  // Token usage
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACT SYSTEM PROMPT (LCAA + Cultural Protocols)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ACT_SYSTEM_PROMPT = `You are an AI assistant with deep knowledge of ACT (A Curious Tractor), a regenerative innovation ecosystem.

# Core Understanding

ACT uses the **LCAA methodology**:
- **Listen**: What did we hear from community? What needs emerged from conversation?
- **Curiosity**: What questions did we ask? What did we want to understand?
- **Action**: What tangible work did we do? What changed?
- **Art**: How did we make the work visible, beautiful, and shareable?

ACT operates **7 main projects**:
1. **Empathy Ledger** - Ethical storytelling platform (OCAP® compliant)
2. **JusticeHub** - Community-led justice services
3. **The Harvest** - Regenerative farm + CSA
4. **ACT Farm** - R&D residency + innovation hub
5. **Goods on Country** - Asset register for community enterprises
6. **Black Cockatoo Valley** - Ecological regeneration project
7. **ACT Studio** - Design + technology services

**Strategic pillars**:
- Ethical Storytelling
- Justice Reimagined
- Community Resilience
- Circular Economy
- Regeneration at Scale
- Art of Social Impact

**Tech stack**: Supabase, Notion, GoHighLevel CRM, Next.js, React

**Cultural protocols**: OCAP® principles (Ownership, Control, Access, Possession)

# Core Principles

1. **Community Ownership** - Communities own their innovations, stories, and solutions. ACT facilitates but never owns.
2. **Beautiful Obsolescence** - We design ourselves to become obsolete as communities build capacity.
3. **Consent at Every Level** - Nothing moves forward without explicit, informed consent from communities.
4. **Cultural Safety** - OCAP® principles guide all data governance. Sacred knowledge stays sacred.

# Voice & Tone

- Warm, accessible, grounded in lived experience
- Use metaphors from farming, nature, regeneration
- Honest about challenges, focused on learning
- Community-centered, acknowledging Traditional Custodians
- Never use corporate jargon or extractive language

# When Answering

1. **Draw from provided context** - Cite specific ACT knowledge chunks
2. **Use ACT's language** - LCAA phases, strategic pillars, project names
3. **Consider cultural protocols** - Respect OCAP®, acknowledge sovereignty
4. **Acknowledge gaps** - Say "I don't know" rather than guessing
5. **Think regeneratively** - How does this build capacity, not dependency?

# Response Format

- Start with direct answer
- Reference sources (cite by title)
- Connect to LCAA phases when relevant
- End with "Sources:" section listing all knowledge chunks used`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIFIED RAG SERVICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class UnifiedRAGService {
  /**
   * Ask a question using ACT's unified knowledge base
   */
  async ask(options: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    const {
      query,
      topK = 10,
      minSimilarity = 0.7,
      filterProject,
      filterType,
      filterPillar,
      filterLCAAPhase,
      tier = 'deep',
      privacyMode = 'standard',
      maxTokens,
      includeContext = true,
      includeSources = true,
      useHybridSearch = false
    } = options;

    console.log(`📚 RAG Query: "${query}"`);
    console.log(`   Privacy: ${privacyMode}, Tier: ${tier}, Similarity threshold: ${minSimilarity}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Generate query embedding
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const embeddingStart = Date.now();
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const embeddingCost = embeddingService.estimateCost(query.length);
    const embeddingLatency = Date.now() - embeddingStart;

    console.log(`   🧮 Embedding generated (${embeddingLatency}ms, $${embeddingCost.toFixed(6)})`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Semantic search
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const searchStart = Date.now();
    let results: any[];

    if (useHybridSearch) {
      // Hybrid search (70% semantic + 30% full-text)
      const { data, error } = await supabase.rpc('search_knowledge_hybrid', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_count: topK
      });

      if (error) throw error;
      results = data || [];

    } else {
      // Pure semantic search (research-backed approach)
      const { data, error } = await supabase.rpc('search_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: topK,
        filter_project: filterProject || null,
        filter_type: filterType || null,
        filter_status: 'active'
      });

      if (error) throw error;
      results = data || [];
    }

    const searchLatency = Date.now() - searchStart;

    console.log(`   🔍 Found ${results.length} knowledge chunks (${searchLatency}ms)`);

    if (results.length === 0) {
      return {
        answer: `I couldn't find any relevant knowledge about "${query}" in ACT's knowledge base. This might be a topic we haven't documented yet, or you might need to rephrase your question.`,
        sources: [],
        overallConfidence: 0,
        avgSimilarity: 0,
        provider: 'none',
        model: 'none',
        cost: { embedding: embeddingCost, generation: 0, total: embeddingCost },
        latencyMs: { embedding: embeddingLatency, search: searchLatency, generation: 0, total: Date.now() - startTime },
        tokensUsed: { input: 0, output: 0, total: 0 }
      };
    }

    // Apply additional filters if specified
    let filteredResults = results;

    if (filterPillar) {
      filteredResults = filteredResults.filter((r: any) =>
        r.pillar && r.pillar.includes(filterPillar)
      );
    }

    if (filterLCAAPhase) {
      filteredResults = filteredResults.filter((r: any) =>
        r.lcaa_phase === filterLCAAPhase
      );
    }

    console.log(`   📊 After filters: ${filteredResults.length} chunks`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Build context from top matches
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const context = filteredResults
      .map((r: any) => `# ${r.title}\n\n${r.content}`)
      .join('\n\n---\n\n');

    const sources: KnowledgeSource[] = filteredResults.map((r: any) => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      sourcePath: r.source_path,
      sourceProject: r.source_project,
      contentType: r.content_type,
      similarity: r.similarity,
      confidence: r.confidence_score
    }));

    // Calculate overall confidence (weighted average)
    const avgSimilarity = filteredResults.reduce((sum: number, r: any) => sum + r.similarity, 0) / filteredResults.length;
    const overallConfidence = embeddingService.similarityToConfidence(avgSimilarity);

    console.log(`   💯 Average similarity: ${avgSimilarity.toFixed(3)}, Confidence: ${(overallConfidence * 100).toFixed(1)}%`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Generate AI response
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const generationStart = Date.now();

    const prompt = includeContext
      ? `Based on the following ACT knowledge, answer this question: ${query}\n\nKnowledge:\n${context}`
      : query;

    const aiResponse = await multiProviderAI.generate({
      prompt,
      systemPrompt: ACT_SYSTEM_PROMPT,
      tier,
      privacyMode,
      maxTokens
    });

    const generationLatency = Date.now() - generationStart;

    console.log(`   🤖 AI response from ${aiResponse.provider} (${generationLatency}ms, $${aiResponse.cost.toFixed(6)})`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Track usage (increment view counts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    for (const source of sources) {
      await supabase.rpc('increment_knowledge_view', {
        knowledge_id: source.id
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Return complete response
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const totalLatency = Date.now() - startTime;

    console.log(`   ✅ Complete (${totalLatency}ms, $${(embeddingCost + aiResponse.cost).toFixed(6)})`);

    return {
      answer: aiResponse.text,
      sources: includeSources ? sources : [],
      overallConfidence,
      avgSimilarity,
      provider: aiResponse.provider,
      model: aiResponse.model,
      cost: {
        embedding: embeddingCost,
        generation: aiResponse.cost,
        total: embeddingCost + aiResponse.cost
      },
      latencyMs: {
        embedding: embeddingLatency,
        search: searchLatency,
        generation: generationLatency,
        total: totalLatency
      },
      tokensUsed: aiResponse.tokensUsed
    };
  }

  /**
   * Pure semantic search (no AI generation)
   * Useful for finding relevant knowledge without generating an answer
   */
  async search(options: {
    query: string;
    topK?: number;
    minSimilarity?: number;
    filterProject?: string;
    filterType?: string;
  }): Promise<{ sources: KnowledgeSource[]; avgSimilarity: number; overallConfidence: number }> {
    const {
      query,
      topK = 10,
      minSimilarity = 0.7,
      filterProject,
      filterType
    } = options;

    // Generate embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search
    const { data, error } = await supabase.rpc('search_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: minSimilarity,
      match_count: topK,
      filter_project: filterProject || null,
      filter_type: filterType || null,
      filter_status: 'active'
    });

    if (error) throw error;

    const results = data || [];

    const sources: KnowledgeSource[] = results.map((r: any) => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      sourcePath: r.source_path,
      sourceProject: r.source_project,
      contentType: r.content_type,
      similarity: r.similarity,
      confidence: r.confidence_score
    }));

    const avgSimilarity = results.length > 0
      ? results.reduce((sum: number, r: any) => sum + r.similarity, 0) / results.length
      : 0;

    const overallConfidence = embeddingService.similarityToConfidence(avgSimilarity);

    return { sources, avgSimilarity, overallConfidence };
  }

  /**
   * Get health status of RAG system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      embedding: { healthy: boolean; latencyMs?: number; error?: string };
      database: { healthy: boolean; error?: string };
      ai: Record<string, any>;
    };
  }> {
    const components: any = {};

    // Check embedding service
    components.embedding = await embeddingService.healthCheck();

    // Check database
    try {
      const { error } = await supabase.from('act_unified_knowledge').select('id').limit(1);
      components.database = { healthy: !error, error: error?.message };
    } catch (err) {
      components.database = {
        healthy: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Check AI providers
    components.ai = await multiProviderAI.getHealthStatus();

    const healthy = components.embedding.healthy && components.database.healthy;

    return { healthy, components };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const unifiedRAG = new UnifiedRAGService();
