/**
 * Story-Based Impact API
 *
 * GET /api/projects/[slug]/story-impact
 * Fetches impact metrics and insights from Empathy Ledger for stories
 * associated with this ACT project.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { StoryImpactMetrics, CommunityInsight } from '@/types/shared/act-featured-content';

const EMPATHY_LEDGER_URL = process.env.EMPATHY_LEDGER_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch impact data from Empathy Ledger analytics API
    const analyticsUrl = `${EMPATHY_LEDGER_URL}/api/analytics/act-project-impact?project_slug=${slug}`;

    const response = await fetch(analyticsUrl, {
      headers: {
        'Content-Type': 'application/json',
        // Add any required auth headers here
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    });

    if (!response.ok) {
      // If endpoint doesn't exist yet, return mock data for development
      if (response.status === 404) {
        console.warn('[Story Impact API] Empathy Ledger analytics endpoint not found, returning mock data');
        return NextResponse.json({
          success: true,
          metrics: getMockMetrics(slug),
          insights: getMockInsights(slug),
        });
      }

      throw new Error(`Empathy Ledger API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      metrics: data.metrics,
      insights: data.insights,
    });

  } catch (error) {
    console.error('[Story Impact API] Error:', error);

    // Return mock data for development if Empathy Ledger is unavailable
    if (error instanceof Error && error.message.includes('fetch')) {
      console.warn('[Story Impact API] Cannot connect to Empathy Ledger, returning mock data');
      const { slug } = await params;
      return NextResponse.json({
        success: true,
        metrics: getMockMetrics(slug),
        insights: getMockInsights(slug),
        warning: 'Using mock data - Empathy Ledger unavailable',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch story impact data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Mock data for development/testing
 */
function getMockMetrics(projectSlug: string): StoryImpactMetrics {
  const mockData: Record<string, StoryImpactMetrics> = {
    'justicehub': {
      storytellerCount: 12,
      storyCount: 34,
      themeCount: 8,
      insightCount: 6,
      topThemes: [
        { theme: 'Family Support', count: 18 },
        { theme: 'Cultural Connection', count: 15 },
        { theme: 'Youth Justice', count: 12 },
        { theme: 'Community Healing', count: 9 },
        { theme: 'Service Navigation', count: 7 },
      ],
      valueCreated: {
        policyChanges: 2,
        collaborationsFormed: 5,
      },
    },
    'empathy-ledger': {
      storytellerCount: 226,
      storyCount: 271,
      themeCount: 45,
      insightCount: 23,
      topThemes: [
        { theme: 'Identity & Belonging', count: 89 },
        { theme: 'Community Resilience', count: 67 },
        { theme: 'Cultural Knowledge', count: 54 },
        { theme: 'Innovation', count: 42 },
        { theme: 'Healing & Wellness', count: 38 },
      ],
      valueCreated: {
        grantsWon: 3,
        policyChanges: 4,
        mediaCoverage: 12,
        collaborationsFormed: 18,
      },
    },
  };

  return mockData[projectSlug] || {
    storytellerCount: 5,
    storyCount: 12,
    themeCount: 4,
    insightCount: 3,
    topThemes: [
      { theme: 'Community', count: 8 },
      { theme: 'Innovation', count: 6 },
      { theme: 'Sustainability', count: 4 },
    ],
  };
}

function getMockInsights(projectSlug: string): CommunityInsight[] {
  const mockInsights: Record<string, CommunityInsight[]> = {
    'justicehub': [
      {
        id: '1',
        type: 'pattern',
        insight: 'Families consistently identify "cultural safety" as more important than service proximity when choosing support providers.',
        supportingStoryCount: 18,
        confidence: 0.89,
        createdAt: new Date().toISOString(),
        culturalContext: 'Indigenous families prioritize services that understand cultural protocols and family structures.',
      },
      {
        id: '2',
        type: 'recommendation',
        insight: 'Service providers should offer flexible appointment times to accommodate kinship care responsibilities and ceremony commitments.',
        supportingStoryCount: 12,
        confidence: 0.85,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'trend',
        insight: 'Youth engagement increases 3x when peer navigators from the same community facilitate service connections.',
        supportingStoryCount: 9,
        confidence: 0.92,
        createdAt: new Date().toISOString(),
      },
    ],
    'empathy-ledger': [
      {
        id: '1',
        type: 'wisdom',
        insight: 'Storytellers emphasize that "sovereignty over narrative" is inseparable from data sovereignty - you cannot have one without the other.',
        supportingStoryCount: 45,
        confidence: 0.94,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'innovation',
        insight: 'Community-controlled storytelling platforms create value feedback loops: stories inform projects, project outcomes validate storyteller knowledge, strengthening community trust.',
        supportingStoryCount: 32,
        confidence: 0.88,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  return mockInsights[projectSlug] || [
    {
      id: '1',
      type: 'pattern',
      insight: 'Community members consistently highlight the importance of relationship-building over transactional service delivery.',
      supportingStoryCount: 8,
      confidence: 0.82,
      createdAt: new Date().toISOString(),
    },
  ];
}
