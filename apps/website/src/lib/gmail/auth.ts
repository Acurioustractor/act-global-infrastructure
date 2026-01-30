/**
 * Gmail OAuth 2.0 Authentication
 * Handles OAuth flow, token storage, and automatic token refresh
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Create OAuth2 client with credentials from environment
 */
export function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate authorization URL for user to consent
 */
export function getAuthUrl(oauth2Client: OAuth2Client): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Required to get refresh token
    scope: SCOPES,
    prompt: 'consent',  // Force consent screen to ensure we get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

/**
 * Get user info from Google
 */
export async function getUserInfo(oauth2Client: OAuth2Client) {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

/**
 * Get authenticated Gmail client for a user
 */
export async function getAuthenticatedClient(userEmail: string): Promise<OAuth2Client> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const oauth2Client = getOAuth2Client();

  // Load tokens from database
  const { data: tokenData, error } = await supabase
    .from('gmail_auth_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('user_email', userEmail)
    .single();

  if (error || !tokenData) {
    throw new Error(`No Gmail tokens found for ${userEmail}. User needs to connect their Gmail account.`);
  }

  if (!tokenData.refresh_token) {
    throw new Error(`No refresh token for ${userEmail}. User needs to re-authorize Gmail access.`);
  }

  // Set credentials
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  });

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (tokens) => {
    console.log('🔄 Gmail tokens refreshed');

    // Update tokens in database
    const updateData: any = {
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      updated_at: new Date().toISOString(),
    };

    // Only update refresh token if we got a new one
    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token;
    }

    await supabase
      .from('gmail_auth_tokens')
      .update(updateData)
      .eq('user_email', userEmail);
  });

  return oauth2Client;
}

/**
 * Check if Gmail API is configured
 */
export function isGmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Save tokens to database
 */
export async function saveTokens(userEmail: string, tokens: any, userId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await supabase
    .from('gmail_auth_tokens')
    .upsert({
      user_email: userEmail,
      user_id: userId || null,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_email'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save Gmail tokens: ${error.message}`);
  }

  return data;
}
