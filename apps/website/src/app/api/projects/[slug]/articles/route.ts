/**
 * Project Articles API - Fetch blog articles related to a project
 *
 * GET /api/projects/[slug]/articles
 * Returns published blog articles from Empathy Ledger content hub
 */

import { NextRequest, NextResponse } from 'next/server';
const EMPATHY_LEDGER_URL =
  process.env.EMPATHY_LEDGER_URL ||
  process.env.NEXT_PUBLIC_EMPATHY_LEDGER_URL ||
  'http://localhost:3030';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const response = await fetch(
      `${EMPATHY_LEDGER_URL}/api/v1/content-hub/articles?project=${slug}&limit=${limit}`,
      {
        headers: {
          ...(process.env.EMPATHY_LEDGER_API_KEY
            ? { 'X-API-Key': process.env.EMPATHY_LEDGER_API_KEY }
            : {}),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Empathy Ledger API error: ${response.status}`);
    }

    const payload = await response.json();
    const articles = (payload.articles || []).map((item: any) => ({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      url: `${EMPATHY_LEDGER_URL}/articles/${item.slug}`,
      featuredImage: item.featuredImageUrl || null,
      author: item.authorName || 'ACT Team',
      publishedDate: item.publishedAt || null,
      tags: item.tags || [],
      source: 'empathy-ledger',
    }));

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
      projectSlug: slug,
    });

  } catch (error) {
    console.error('[Project Articles API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
