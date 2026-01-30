/**
 * ACT Living Wiki - Notion Scan API
 *
 * Triggers a scan of Notion workspace for new knowledge
 *
 * Usage:
 *   POST /api/knowledge/scan-notion
 *
 * Can be called:
 *   - Manually from admin dashboard
 *   - Via cron job (daily)
 *   - Via webhook (when Notion page updated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotionScanner } from '@/lib/knowledge/notion-scanner';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Notion scan...');

    // Optional: Check authentication
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Create scanner
    const scanner = new NotionScanner();

    // Scan workspace for new/updated pages
    const extractions = await scanner.scanWorkspace();

    if (extractions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new knowledge found',
        scanned: 0,
        extracted: 0,
        queued: 0,
      });
    }

    // Save extractions to queue for review
    await scanner.saveToQueue(extractions);

    // Return results
    return NextResponse.json({
      success: true,
      message: `Scanned Notion and found ${extractions.length} knowledge items`,
      scanned: extractions.length,
      extracted: extractions.length,
      queued: extractions.length,
      items: extractions.map(ext => ({
        title: ext.source_title,
        type: ext.suggested_type,
        confidence: ext.confidence_score,
        url: ext.source_url,
      })),
    });
  } catch (error) {
    console.error('❌ Error scanning Notion:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan Notion',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check scan status
 */
export async function GET(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get last sync info
    const { data: syncData } = await supabase
      .from('knowledge_source_sync')
      .select('*')
      .eq('source_type', 'notion')
      .single();

    // Get pending queue items
    const { data: queueData, count } = await supabase
      .from('knowledge_extraction_queue')
      .select('*', { count: 'exact' })
      .eq('source_type', 'notion')
      .eq('status', 'pending');

    return NextResponse.json({
      lastSync: syncData?.last_sync_at || null,
      nextSync: syncData?.next_sync_at || null,
      status: syncData?.status || 'never_run',
      pendingReviews: count || 0,
      recentExtractions: queueData?.slice(0, 5).map(item => ({
        title: item.source_title,
        type: item.suggested_type,
        confidence: item.confidence_score,
        createdAt: item.created_at,
      })) || [],
    });
  } catch (error) {
    console.error('❌ Error checking scan status:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check status',
      },
      { status: 500 }
    );
  }
}
