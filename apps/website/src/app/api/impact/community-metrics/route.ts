/**
 * Community Metrics API - Proxy to Empathy Ledger v2
 *
 * GET /api/impact/community-metrics
 * Fetches aggregated community impact metrics from Empathy Ledger
 * for display across ACT sites.
 */

import { NextRequest, NextResponse } from 'next/server';

const EMPATHY_LEDGER_URL = process.env.EMPATHY_LEDGER_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${EMPATHY_LEDGER_URL}/api/analytics/community-metrics`, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if Empathy Ledger requires it
        ...(process.env.EMPATHY_LEDGER_API_KEY && {
          'Authorization': `Bearer ${process.env.EMPATHY_LEDGER_API_KEY}`,
        }),
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    });

    if (!response.ok) {
      // If Empathy Ledger is unavailable, return mock data
      if (response.status === 404 || response.status >= 500) {
        console.warn('[Community Metrics] Empathy Ledger unavailable, returning mock data');
        return NextResponse.json({
          success: true,
          metrics: getMockCommunityMetrics(),
          source: 'Mock Data (Empathy Ledger offline)',
          warning: 'Using fallback data - Empathy Ledger unavailable',
        });
      }

      throw new Error(`Empathy Ledger API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      metrics: data.data,
      source: 'Empathy Ledger v2',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Community Metrics API] Error:', error);

    // Return mock data if connection fails
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('ECONNREFUSED'))) {
      console.warn('[Community Metrics] Cannot connect to Empathy Ledger, returning mock data');
      return NextResponse.json({
        success: true,
        metrics: getMockCommunityMetrics(),
        source: 'Mock Data (Connection failed)',
        warning: 'Using fallback data - Cannot connect to Empathy Ledger',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch community metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Mock community metrics for development/offline scenarios
 */
function getMockCommunityMetrics() {
  return {
    totalStories: 271,
    totalTranscripts: 89,
    activeStorytellers: 226,
    culturalThemes: [
      'Resilience',
      'Community',
      'Heritage',
      'Healing',
      'Connection',
      'Identity',
      'Justice',
      'Youth Empowerment',
      'Environmental Stewardship',
      'Cultural Safety',
    ],
    healingJourneys: 42,
    intergenerationalConnections: 67,
    elderWisdomQuotes: 34,
    communityResilience: 78,
    culturalVitality: 85,
  };
}
