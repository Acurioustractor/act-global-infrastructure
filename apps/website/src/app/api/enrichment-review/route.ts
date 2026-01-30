/**
 * Enrichment Review API
 *
 * GET /api/enrichment-review - List enrichment items for review
 * POST /api/enrichment-review - Create new enrichment review item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || 'pending';
    const projectSlug = searchParams.get('projectSlug');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('enrichment_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (projectSlug) {
      query = query.eq('project_slug', projectSlug);
    }

    if (type) {
      query = query.eq('enrichment_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Enrichment Review API] Error fetching reviews:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      metadata: {
        count: data?.length || 0,
        status,
        limit,
      },
    });
  } catch (error) {
    console.error('[Enrichment Review API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch enrichment reviews',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.project_slug || !body.enrichment_type || !body.ai_generated) {
      return NextResponse.json(
        { error: 'Missing required fields: project_slug, enrichment_type, ai_generated' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('enrichment_reviews')
      .insert({
        project_slug: body.project_slug,
        project_title: body.project_title,
        enrichment_type: body.enrichment_type,
        ai_generated: body.ai_generated,
        original_data: body.original_data,
        confidence: body.confidence || 0.5,
        reasoning: body.reasoning,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Enrichment Review API] Error creating review:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Enrichment Review API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create enrichment review',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
