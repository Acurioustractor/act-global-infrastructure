import { NextResponse } from 'next/server';
import { unifiedRAG } from '@/lib/ai-intelligence/unified-rag-service';

/**
 * GET /api/v1/intelligence/health
 *
 * Health check for the entire intelligence system
 *
 * Response:
 * {
 *   "healthy": true,
 *   "components": {
 *     "embedding": { "healthy": true, "latencyMs": 450 },
 *     "database": { "healthy": true },
 *     "ai": {
 *       "claude": { "healthy": true, "latencyMs": 890 },
 *       "openai": { "healthy": true, "latencyMs": 650 },
 *       "perplexity": { "healthy": false, "error": "Not configured" },
 *       "ollama": { "healthy": true, "latencyMs": 1200 }
 *     }
 *   }
 * }
 */
export async function GET() {
  try {
    const health = await unifiedRAG.healthCheck();

    const status = health.healthy ? 200 : 503;

    return NextResponse.json(health, { status });

  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
