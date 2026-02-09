#!/usr/bin/env node
/**
 * Xero OAuth2 Authentication Helper (PKCE Flow)
 *
 * Usage:
 *   node scripts/xero-auth.mjs         - Start auth flow (opens browser)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { randomBytes, createHash } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { URL } from 'url';

dotenv.config({ path: '.env.local' });

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');
const REDIRECT_URI = 'http://localhost:5678/callback';

const SCOPES = 'email profile openid accounting.contacts accounting.contacts.read accounting.settings accounting.settings.read accounting.reports.read accounting.transactions accounting.transactions.read accounting.budgets.read offline_access';

// PKCE helpers
function generateCodeVerifier() {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function startAuthFlow() {
  console.log('=========================================');
  console.log('  Xero OAuth2 Authentication (PKCE)');
  console.log('=========================================\n');

  if (!XERO_CLIENT_ID) {
    console.error('Missing XERO_CLIENT_ID in .env.local');
    process.exit(1);
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  console.log(`   Client ID: ${XERO_CLIENT_ID}`);
  console.log(`   Using PKCE flow (S256)\n`);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: 'act-infrastructure',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;

  console.log('Starting local server to receive callback...\n');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDesc = url.searchParams.get('error_description');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error: ${error}</h1><p>${errorDesc || ''}</p>`);
        console.error(`\n   Error: ${error}`);
        if (errorDesc) console.error(`   ${errorDesc}`);
        server.close();
        process.exit(1);
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>Authorization code received. Check terminal.</p><p>You can close this window.</p>');

        console.log('\n   Authorization code received!');
        console.log('   Exchanging for tokens...\n');

        await exchangeCodeForTokens(code, codeVerifier);
        server.close();
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<p>Waiting for Xero callback...</p>');
    }
  });

  server.listen(5678, () => {
    console.log('1. Open this URL in your browser:\n');
    console.log(`   ${authUrl}\n`);
    console.log('2. Authorize the app when prompted');
    console.log('3. You will be redirected back here automatically\n');
    console.log('   Waiting for callback...');
  });
}

async function exchangeCodeForTokens(code, codeVerifier) {
  try {
    const body = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: XERO_CLIENT_ID,
    };

    // Include code_verifier for PKCE
    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    // Include client secret if available (confidential client + PKCE)
    if (XERO_CLIENT_SECRET) {
      const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      process.exit(1);
    }

    const tokens = await response.json();

    console.log('   Tokens received!');
    console.log(`   Access token expires in: ${tokens.expires_in}s`);

    // Get tenant ID
    console.log('\n   Fetching tenant ID...');
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const connections = await connectionsResponse.json();
    const tenant = connections[0];

    if (!tenant) {
      console.error('No Xero organizations found');
      process.exit(1);
    }

    console.log(`   Tenant: ${tenant.tenantName} (${tenant.tenantId})`);

    // Save locally
    writeFileSync(TOKEN_FILE, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000) - 60000,
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName
    }, null, 2));

    console.log(`\n   Saved to ${TOKEN_FILE}`);

    // Save to Supabase
    if (supabase) {
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000) - 60000);
      const { error } = await supabase
        .from('xero_tokens')
        .upsert({
          id: 'default',
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: 'manual-auth'
        }, { onConflict: 'id' });

      if (error) {
        console.warn('   Could not save to Supabase:', error.message);
      } else {
        console.log('   Saved to Supabase (shared storage)');
      }
    }

    console.log('\n=========================================');
    console.log('  Authentication Complete!');
    console.log('=========================================\n');
    console.log('Add these to your .env.local if not already set:\n');
    console.log(`   XERO_TENANT_ID=${tenant.tenantId}`);
    console.log('\nYou can now run:');
    console.log('   node scripts/sync-xero-to-supabase.mjs full');
    console.log('   node scripts/sync-xero-bank-feed.mjs');

    process.exit(0);

  } catch (error) {
    console.error('Error exchanging code:', error.message);
    process.exit(1);
  }
}

startAuthFlow();
