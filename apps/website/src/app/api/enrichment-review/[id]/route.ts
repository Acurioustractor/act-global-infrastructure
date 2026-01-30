/**
 * Enrichment Review Item API
 *
 * GET /api/enrichment-review/[id] - Get single review item
 * PATCH /api/enrichment-review/[id] - Update review status (approve/reject)
 * DELETE /api/enrichment-review/[id] - Delete review item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('enrichment_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Enrichment Review API] Error fetching review:', error);
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Enrichment Review API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch enrichment review',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const updates: any = {};

    if (body.status) {
      updates.status = body.status;
      if (body.status === 'approved' || body.status === 'rejected') {
        updates.reviewed_at = new Date().toISOString();
        // TODO: See issue #26 in act-regenerative-studio: Get actual user ID from auth
        // updates.reviewed_by = user.id;
      }
    }

    if (body.reviewer_notes) {
      updates.reviewer_notes = body.reviewer_notes;
    }

    const { data, error } = await supabase
      .from('enrichment_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Enrichment Review API] Error updating review:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Enrichment ${body.status}`,
    });
  } catch (error) {
    console.error('[Enrichment Review API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update enrichment review',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from('enrichment_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Enrichment Review API] Error deleting review:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Enrichment review deleted successfully',
    });
  } catch (error) {
    console.error('[Enrichment Review API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete enrichment review',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
