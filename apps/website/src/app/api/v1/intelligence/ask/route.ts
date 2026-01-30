import { NextRequest, NextResponse } from 'next/server';
import { unifiedRAG } from '@/lib/ai-intelligence/unified-rag-service';
import type { RAGQuery } from '@/lib/ai-intelligence/unified-rag-service';

/**
 * POST /api/v1/intelligence/ask
 *
 * Ask a question using ACT's unified knowledge base with RAG
 *
 * Request body:
 * {
 *   "query": "What is the LCAA methodology?",
 *   "topK": 10,
 *   "minSimilarity": 0.7,
 *   "tier": "deep",
 *   "privacyMode": "standard",
 *   "filterProject": "empathy-ledger",
 *   "filterType": "principle"
 * }
 *
 * Response:
 * {
 *   "answer": "...",
 *   "sources": [...],
 *   "overallConfidence": 0.92,
 *   "cost": { "total": 0.015 },
 *   "latencyMs": { "total": 1234 }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: RAGQuery = await request.json();

    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (query.length > 5000) {
      return NextResponse.json(
        { error: 'Query too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Execute RAG query
    const response = await unifiedRAG.ask(body);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Intelligence API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/intelligence/ask?q=...
 *
 * Simple GET endpoint for quick queries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const tier = (searchParams.get('tier') as any) || 'deep';
    const privacyMode = (searchParams.get('privacyMode') as any) || 'standard';

    const response = await unifiedRAG.ask({
      query,
      tier,
      privacyMode
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Intelligence API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
