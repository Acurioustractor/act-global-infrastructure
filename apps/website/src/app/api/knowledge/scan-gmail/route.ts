/**
 * Gmail Knowledge Scanner API
 * POST /api/knowledge/scan-gmail - Scans Gmail for knowledge
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGmailScan } from '@/lib/knowledge/gmail-scanner';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting Gmail scan for: ${userEmail}`);
    const results = await runGmailScan(userEmail);

    return NextResponse.json({
      success: true,
      message: `Scanned ${results.scanned} emails, extracted ${results.extracted} knowledge items`,
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Gmail scan failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gmail scan failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge/scan-gmail - Get info about Gmail scanner
 */
export async function GET() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  // Get list of connected accounts
  const { data: accounts } = await supabase
    .from('gmail_sync_stats')
    .select('*')
    .order('last_sync_at', { ascending: false });

  return NextResponse.json({
    message: 'Gmail scanner ready',
    connected_accounts: accounts || [],
    endpoints: {
      connect: 'GET /api/auth/gmail',
      scan: 'POST /api/knowledge/scan-gmail',
    },
  });
}
