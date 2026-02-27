/**
 * Gmail Push Processing
 *
 * Handles incremental Gmail sync triggered by Pub/Sub push notifications.
 * Fetches new messages since the last known historyId, parses them,
 * and upserts to communications_history.
 */

import { google, type gmail_v1 } from 'googleapis';
import { supabase } from '@/lib/supabase';

// Reusable types
interface GmailSyncState {
  email_address: string;
  history_id: string;
  last_sync_at: string;
}

interface ContactMatch {
  ghl_contact_id: string;
  full_name: string;
}

/**
 * Get an authenticated Gmail client for a specific user via service account delegation.
 */
async function getGmailClient(userEmail: string): Promise<gmail_v1.Gmail> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: userEmail,
  });

  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

/**
 * Load GHL contacts email map for matching.
 */
async function loadContactEmailMap(): Promise<Map<string, ContactMatch>> {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, email, full_name')
    .not('email', 'is', null);

  if (error) {
    console.warn('[GmailPush] Could not load contacts:', error.message);
    return new Map();
  }

  const map = new Map<string, ContactMatch>();
  for (const c of data || []) {
    if (c.email) {
      map.set(c.email.toLowerCase(), {
        ghl_contact_id: c.ghl_id,
        full_name: c.full_name,
      });
    }
  }
  return map;
}

// Email parsing helpers (matching sync-gmail-to-supabase.mjs patterns)
function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | null {
  const h = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || null;
}

function extractEmail(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : value.toLowerCase().trim();
}

function extractEmails(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => extractEmail(part.trim()))
    .filter((e): e is string => !!e);
}

const OWN_DOMAINS = ['act.place', 'acurious.farm'];

function isOwnDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return OWN_DOMAINS.includes(domain || '');
}

function determineDirection(from: string | null, to: string | null, delegatedUser: string): 'inbound' | 'outbound' {
  const fromEmail = extractEmail(from);
  if (fromEmail === delegatedUser.toLowerCase()) return 'outbound';
  const toEmails = extractEmails(to);
  if (toEmails.includes(delegatedUser.toLowerCase())) return 'inbound';
  return 'inbound';
}

function matchContact(
  from: string | null,
  to: string | null,
  cc: string | null,
  direction: string,
  contactMap: Map<string, ContactMatch>
): string | null {
  const fromEmail = extractEmail(from);
  const senderIsInternal = fromEmail ? isOwnDomain(fromEmail) : false;

  const emailsToCheck =
    direction === 'outbound' || senderIsInternal
      ? [...extractEmails(to), ...extractEmails(cc)]
      : fromEmail
        ? [fromEmail]
        : [];

  for (const email of emailsToCheck) {
    if (email && !isOwnDomain(email)) {
      const match = contactMap.get(email);
      if (match) return match.ghl_contact_id;
    }
  }
  return null;
}

/**
 * Process Gmail history changes since a given historyId.
 * This is called when a Pub/Sub push notification arrives.
 */
export async function processGmailHistory(
  emailAddress: string,
  notifiedHistoryId: string
): Promise<{ messagesProcessed: number; errors: number }> {
  const stats = { messagesProcessed: 0, errors: 0 };

  // Get last known historyId from our sync state
  const { data: syncState } = await supabase
    .from('gmail_sync_state')
    .select('history_id')
    .eq('email_address', emailAddress)
    .maybeSingle();

  const startHistoryId = syncState?.history_id || notifiedHistoryId;

  const gmail = await getGmailClient(emailAddress);
  const contactMap = await loadContactEmailMap();

  // Fetch history changes
  let messageIds: string[] = [];
  let pageToken: string | undefined;
  let newHistoryId = startHistoryId;

  try {
    do {
      const res = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        pageToken,
      });

      if (res.data.history) {
        for (const h of res.data.history) {
          if (h.messagesAdded) {
            for (const added of h.messagesAdded) {
              if (added.message?.id) {
                messageIds.push(added.message.id);
              }
            }
          }
        }
      }

      if (res.data.historyId) {
        newHistoryId = res.data.historyId;
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    // 404 means historyId is too old — fall back to listing recent messages
    if (error.code === 404) {
      console.warn(`[GmailPush] History expired for ${emailAddress}, fetching recent messages`);
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: 'newer_than:1h',
      });
      messageIds = (listRes.data.messages || []).map((m) => m.id!).filter(Boolean);
    } else {
      throw err;
    }
  }

  // Deduplicate
  messageIds = [...new Set(messageIds)];

  if (messageIds.length === 0) {
    // Still update historyId
    await upsertSyncState(emailAddress, newHistoryId);
    return stats;
  }

  // Check which messages already exist
  const { data: existing } = await supabase
    .from('communications_history')
    .select('source_id')
    .eq('source_system', 'gmail')
    .in('source_id', messageIds);

  const existingIds = new Set((existing || []).map((r: { source_id: string }) => r.source_id));
  const newMessageIds = messageIds.filter((id) => !existingIds.has(id));

  // Fetch and transform new messages
  const records = [];

  for (const msgId of newMessageIds) {
    try {
      const { data: fullMessage } = await gmail.users.messages.get({
        userId: 'me',
        id: msgId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'],
      });

      if (!fullMessage) continue;

      const headers = fullMessage.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const to = getHeader(headers, 'To');
      const cc = getHeader(headers, 'Cc');
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');
      const messageIdHeader = getHeader(headers, 'Message-ID');

      const direction = determineDirection(from, to, emailAddress);
      const contactId = matchContact(from, to, cc, direction, contactMap);

      let occurredAt: string;
      try {
        occurredAt = date ? new Date(date).toISOString() : new Date(parseInt(fullMessage.internalDate || '0')).toISOString();
      } catch {
        occurredAt = new Date(parseInt(fullMessage.internalDate || '0')).toISOString();
      }

      records.push({
        ghl_contact_id: contactId,
        channel: 'email',
        direction,
        subject,
        content_preview: (fullMessage.snippet || '').substring(0, 500),
        source_system: 'gmail',
        source_id: fullMessage.id!,
        source_thread_id: fullMessage.threadId,
        occurred_at: occurredAt,
        metadata: {
          from,
          to,
          cc,
          message_id: messageIdHeader,
          labels: fullMessage.labelIds || [],
          snippet: fullMessage.snippet,
          size_estimate: fullMessage.sizeEstimate,
          internal_date: fullMessage.internalDate,
          push_synced: true,
        },
        synced_at: new Date().toISOString(),
      });

      stats.messagesProcessed++;

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err) {
      console.error(`[GmailPush] Error fetching message ${msgId}:`, (err as Error).message);
      stats.errors++;
    }
  }

  // Upsert to Supabase
  if (records.length > 0) {
    const { error } = await supabase
      .from('communications_history')
      .upsert(records, {
        onConflict: 'source_system,source_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('[GmailPush] Upsert error:', error.message);
      stats.errors += records.length;
    }
  }

  // Update sync state with new historyId
  await upsertSyncState(emailAddress, newHistoryId);

  return stats;
}

/**
 * Update the gmail_sync_state table with latest historyId.
 */
async function upsertSyncState(emailAddress: string, historyId: string): Promise<void> {
  const { error } = await supabase
    .from('gmail_sync_state')
    .upsert(
      {
        email_address: emailAddress,
        history_id: historyId,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: 'email_address' }
    );

  if (error) {
    console.error('[GmailPush] Failed to update sync state:', error.message);
  }
}
