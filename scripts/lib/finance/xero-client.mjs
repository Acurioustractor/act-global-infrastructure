/**
 * Unified Xero API Client
 *
 * Single source of truth for all Xero API interactions:
 * - OAuth2 token management (Supabase-first, file fallback)
 * - Authenticated API requests with auto-refresh
 * - Rate limiting (60 calls/min)
 * - Attachment uploads
 * - Bank transaction updates (tracking categories)
 *
 * Usage:
 *   import { createXeroClient } from './lib/finance/xero-client.mjs';
 *   const xero = await createXeroClient(supabase);
 *   const data = await xero.get('BankTransactions?page=1');
 *   await xero.uploadAttachment('BankTransactions', txId, filename, buffer, mimeType);
 *   await xero.updateBankTransactionTracking(txId, trackingPayload);
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const XERO_API = 'https://api.xero.com/api.xro/2.0';
const XERO_IDENTITY = 'https://identity.xero.com/connect/token';
const RATE_LIMIT_MS = 1100; // ~55 calls/min to stay within 60/min limit

/**
 * Create an authenticated Xero API client.
 *
 * Token resolution order:
 *   1. Supabase xero_tokens table (shared, preferred)
 *   2. Local .xero-tokens.json file (fallback)
 *   3. Environment variables (last resort)
 *   4. Refresh using whatever refresh token was found
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} [opts]
 * @param {string} [opts.tokenFile] - Path to local token file
 * @returns {Promise<XeroClient>}
 */
export async function createXeroClient(supabase, opts = {}) {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const tenantId = process.env.XERO_TENANT_ID;
  const tokenFile = opts.tokenFile || path.join(process.cwd(), '.xero-tokens.json');

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing XERO_CLIENT_ID, XERO_CLIENT_SECRET, or XERO_TENANT_ID');
  }

  let accessToken = process.env.XERO_ACCESS_TOKEN || null;
  let refreshToken = process.env.XERO_REFRESH_TOKEN || null;
  let lastCallTime = 0;

  // --- Token persistence ---

  async function loadFromSupabase() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('xero_tokens')
        .select('refresh_token, access_token, expires_at')
        .eq('id', 'default')
        .single();
      if (error || !data || data.refresh_token === 'placeholder') return null;
      if (data.access_token && new Date(data.expires_at).getTime() > Date.now()) {
        return { access_token: data.access_token, refresh_token: data.refresh_token, valid: true };
      }
      return { refresh_token: data.refresh_token, valid: false };
    } catch { return null; }
  }

  function loadFromFile() {
    try {
      if (existsSync(tokenFile)) {
        const tokens = JSON.parse(readFileSync(tokenFile, 'utf8'));
        if (tokens.access_token && tokens.expires_at > Date.now()) {
          return { access_token: tokens.access_token, refresh_token: tokens.refresh_token, valid: true };
        }
        if (tokens.refresh_token) {
          return { refresh_token: tokens.refresh_token, valid: false };
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  async function saveTokens(newAccessToken, newRefreshToken, expiresIn) {
    accessToken = newAccessToken;
    refreshToken = newRefreshToken;

    // Save to file (local backup)
    try {
      writeFileSync(tokenFile, JSON.stringify({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: Date.now() + (expiresIn * 1000) - 60000,
      }, null, 2));
    } catch { /* ignore */ }

    // Save to Supabase (shared/primary)
    if (supabase) {
      try {
        const expiresAt = new Date(Date.now() + (expiresIn * 1000) - 60000);
        await supabase.from('xero_tokens').upsert({
          id: 'default',
          refresh_token: newRefreshToken,
          access_token: newAccessToken,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local',
        }, { onConflict: 'id' });
      } catch { /* ignore */ }
    }
  }

  async function refresh() {
    if (!refreshToken) return false;
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await fetch(XERO_IDENTITY, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const tokens = await response.json();
      await saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      return true;
    } catch { return false; }
  }

  // --- Initialize: resolve a valid access token ---

  async function ensureValidToken() {
    // 1. Supabase (shared, preferred)
    const sbTokens = await loadFromSupabase();
    if (sbTokens?.valid) {
      accessToken = sbTokens.access_token;
      refreshToken = sbTokens.refresh_token;
      return true;
    }
    if (sbTokens?.refresh_token) refreshToken = sbTokens.refresh_token;

    // 2. Local file
    const fileTokens = loadFromFile();
    if (fileTokens?.valid) {
      accessToken = fileTokens.access_token;
      refreshToken = fileTokens.refresh_token || refreshToken;
      return true;
    }
    if (fileTokens?.refresh_token) refreshToken = fileTokens.refresh_token;

    // 3. Refresh
    return await refresh();
  }

  // --- Rate limiting ---

  async function rateLimit() {
    const now = Date.now();
    const elapsed = now - lastCallTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }
    lastCallTime = Date.now();
  }

  // --- API methods ---

  /**
   * Make an authenticated GET/POST/PUT request to Xero.
   * Auto-refreshes token on 401.
   */
  async function request(endpoint, options = {}) {
    await rateLimit();

    if (!accessToken) {
      const ok = await ensureValidToken();
      if (!ok) throw new Error('Cannot obtain valid Xero access token');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${XERO_API}/${endpoint}`;
    const method = options.method || 'GET';

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
      ...options.headers,
    };
    if (method !== 'GET' && !options.rawBody) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOpts = { method, headers };
    if (options.body && !options.rawBody) {
      fetchOpts.body = JSON.stringify(options.body);
    } else if (options.rawBody) {
      fetchOpts.body = options.rawBody;
    }

    const response = await fetch(url, fetchOpts);

    if (response.status === 401 && !options._retried) {
      const refreshed = await refresh();
      if (refreshed) {
        return request(endpoint, { ...options, _retried: true });
      }
      throw new Error('Xero 401: token refresh failed');
    }

    if (response.status === 429) {
      // Rate limited — wait and retry once
      await new Promise(r => setTimeout(r, 5000));
      if (!options._retried) {
        return request(endpoint, { ...options, _retried: true });
      }
      throw new Error('Xero 429: rate limited after retry');
    }

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Xero ${response.status}: ${errorText.slice(0, 500)}`);
      err.status = response.status;
      err.xeroError = errorText;
      throw err;
    }

    return await response.json();
  }

  /**
   * Convenience: GET request.
   */
  async function get(endpoint) {
    return request(endpoint);
  }

  /**
   * Convenience: POST request with JSON body.
   */
  async function post(endpoint, body) {
    return request(endpoint, { method: 'POST', body });
  }

  /**
   * Upload a file attachment to a Xero object (BankTransaction, Invoice, etc).
   *
   * @param {string} objectType - e.g. 'BankTransactions', 'Invoices'
   * @param {string} objectId - The Xero object ID
   * @param {string} filename - Filename for the attachment
   * @param {Buffer} fileBuffer - Raw file bytes
   * @param {string} contentType - MIME type (e.g. 'application/pdf')
   */
  async function uploadAttachment(objectType, objectId, filename, fileBuffer, contentType) {
    return request(`${objectType}/${objectId}/Attachments/${filename}`, {
      method: 'PUT',
      rawBody: fileBuffer,
      headers: { 'Content-Type': contentType },
    });
  }

  /**
   * Update tracking categories on a bank transaction's line items.
   * Preserves existing line item data, only updates tracking.
   *
   * @param {string} bankTransactionId
   * @param {Array} trackingPayload - [{TrackingCategoryID, TrackingOptionID}]
   */
  async function updateBankTransactionTracking(bankTransactionId, trackingPayload) {
    const txData = await get(`BankTransactions/${bankTransactionId}`);
    const bankTx = txData.BankTransactions?.[0];
    if (!bankTx) throw new Error(`Bank transaction ${bankTransactionId} not found`);

    const lineItems = bankTx.LineItems || [];
    if (lineItems.length === 0) {
      throw new Error(`No line items on ${bankTransactionId} — cannot add tracking`);
    }

    for (const item of lineItems) {
      item.Tracking = trackingPayload;
    }

    return post(`BankTransactions/${bankTransactionId}`, {
      BankTransactions: [{
        BankTransactionID: bankTransactionId,
        LineItems: lineItems,
      }],
    });
  }

  // --- Initialize on creation ---
  const tokenOk = await ensureValidToken();
  if (!tokenOk) {
    console.warn('[xero-client] Could not obtain valid token on init — will retry on first request');
  }

  return {
    get,
    post,
    request,
    uploadAttachment,
    updateBankTransactionTracking,
    ensureValidToken,
    /** Get current access token (for libs that need it directly) */
    getAccessToken: () => accessToken,
    /** Get tenant ID */
    getTenantId: () => tenantId,
  };
}
