import { NextRequest, NextResponse } from 'next/server';
import { unifiedRAG } from '@/lib/ai-intelligence/unified-rag-service';

/**
 * GET /api/v1/intelligence/search
 *
 * Pure semantic search (no AI generation)
 * Returns matching knowledge chunks without generating an answer
 *
 * Query parameters:
 * - q: Search query (required)
 * - topK: Number of results (default: 10)
 * - minSimilarity: Minimum similarity threshold (default: 0.7)
 * - project: Filter by project (optional)
 * - type: Filter by content type (optional)
 *
 * Response:
 * {
 *   "sources": [
 *     {
 *       "id": "...",
 *       "title": "...",
 *       "excerpt": "...",
 *       "similarity": 0.85,
 *       "confidence": 0.92
 *     }
 *   ],
 *   "avgSimilarity": 0.82,
 *   "overallConfidence": 0.89
 * }
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

    const topK = parseInt(searchParams.get('topK') || '10');
    const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.7');
    const filterProject = searchParams.get('project') || undefined;
    const filterType = searchParams.get('type') || undefined;

    const result = await unifiedRAG.search({
      query,
      topK,
      minSimilarity,
      filterProject,
      filterType
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Search API error:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
