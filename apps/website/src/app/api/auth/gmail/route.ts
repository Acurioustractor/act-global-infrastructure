/**
 * Gmail OAuth - Initiate authorization
 * GET /api/auth/gmail - Redirects user to Google consent screen
 */

import { NextResponse } from 'next/server';
import { getOAuth2Client, getAuthUrl, isGmailConfigured } from '@/lib/gmail/auth';

export async function GET() {
  try {
    if (!isGmailConfigured()) {
      return NextResponse.json(
        {
          error: 'Gmail API not configured',
          message: 'Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local',
        },
        { status: 500 }
      );
    }

    const oauth2Client = getOAuth2Client();
    const authUrl = getAuthUrl(oauth2Client);

    // Redirect to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('❌ Gmail auth error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate Gmail authorization',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
