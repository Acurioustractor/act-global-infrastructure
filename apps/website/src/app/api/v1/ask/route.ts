/**
 * ACT Intelligence Hub - Query API
 *
 * REST endpoint for querying the unified knowledge base.
 * Accessible from web UI, CLI, or external integrations.
 *
 * POST /api/v1/ask
 * Body: { query: string, tier?: 'quick' | 'deep', includeSources?: boolean }
 * Response: { answer, sources?, confidence, cost, latency }
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedRAG } from '@/lib/ai-intelligence/unified-rag-service';
import type { AnalysisTier } from '@/lib/ai-intelligence/types';

// CORS headers for cross-origin requests (if needed)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Main query handler
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const {
      query,
      tier = 'deep',
      includeSources = false,
      topK,
      minSimilarity,
      useHybridSearch
    } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate tier
    const validTiers: AnalysisTier[] = ['quick', 'deep', 'comprehensive'];
    if (tier && !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting check (optional - implement based on needs)
    // const userId = req.headers.get('x-user-id');
    // await checkRateLimit(userId);

    // Execute query
    const startTime = Date.now();

    const response = await unifiedRAG.ask({
      query: query.trim(),
      tier: tier as AnalysisTier,
      topK: topK || (tier === 'quick' ? 5 : 10),
      minSimilarity: minSimilarity || (tier === 'quick' ? 0.6 : 0.7),
      includeSources,
      useHybridSearch: useHybridSearch ?? (tier === 'deep' || tier === 'comprehensive')
    });

    const totalTime = Date.now() - startTime;

    // Log query for analytics (optional)
    console.log(`[Query] "${query.substring(0, 50)}..." | Tier: ${tier} | Time: ${totalTime}ms | Cost: $${response.cost.total.toFixed(4)}`);

    // Return response
    return NextResponse.json(
      {
        query,
        answer: response.answer,
        sources: includeSources ? response.sources : undefined,
        confidence: response.overallConfidence,
        cost: {
          embedding: response.cost.embedding,
          generation: response.cost.generation,
          total: response.cost.total
        },
        latency: {
          embedding: response.latencyMs.embedding,
          search: response.latencyMs.search,
          generation: response.latencyMs.generation,
          total: totalTime
        },
        tier,
        timestamp: new Date().toISOString()
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Query API Error]', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429, headers: corsHeaders }
        );
      }

      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET handler for health check
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'ACT Intelligence Hub Query API',
      version: '1.0.0',
      endpoints: {
        query: 'POST /api/v1/ask',
        health: 'GET /api/v1/ask'
      }
    },
    { headers: corsHeaders }
  );
}
