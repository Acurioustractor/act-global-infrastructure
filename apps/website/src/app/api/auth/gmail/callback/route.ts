/**
 * Gmail OAuth - Callback handler
 * GET /api/auth/gmail/callback - Handles OAuth redirect from Google
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getTokensFromCode, getOAuth2Client, getUserInfo, saveTokens } from '@/lib/gmail/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle authorization denial
  if (error) {
    console.error('❌ Gmail authorization denied:', error);
    return NextResponse.redirect(
      new URL(`/admin/settings?gmail_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Authorization code not found' },
      { status: 400 }
    );
  }

  try {
    console.log('🔐 Exchanging authorization code for tokens...');

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user email from Google
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const userInfo = await getUserInfo(oauth2Client);

    if (!userInfo.email) {
      throw new Error('Failed to get user email from Google');
    }

    console.log(`✅ Authenticated Gmail for: ${userInfo.email}`);

    // Save tokens to database
    await saveTokens(userInfo.email, tokens);

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/admin/settings?gmail_connected=${encodeURIComponent(userInfo.email)}`, request.url)
    );
  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/settings?gmail_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
