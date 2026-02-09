#!/usr/bin/env node

/**
 * ACT iMessage Sync
 *
 * Syncs iMessage conversations between founders (Nick + Ben) to Supabase
 * communications_history for searchable recall. Handles text messages and
 * image attachments with AI descriptions.
 *
 * Architecture:
 *   ~/Library/Messages/chat.db (SQLite, read-only)
 *     → communications_history (text messages)
 *     → imessage_attachments (images with AI descriptions)
 *     → knowledge_chunks (embeddings for semantic search)
 *
 * Requirements:
 *   - macOS with Full Disk Access for Terminal
 *   - better-sqlite3 npm package
 *   - Founder handles configured in IMESSAGE_HANDLES env var or defaults
 *
 * Usage:
 *   node scripts/sync-imessage.mjs                  # Incremental sync
 *   node scripts/sync-imessage.mjs --full           # Full sync (all messages)
 *   node scripts/sync-imessage.mjs --dry-run        # Preview without changes
 *   node scripts/sync-imessage.mjs --days 30        # Last 30 days only
 *   node scripts/sync-imessage.mjs --stats          # Show stats only
 *   node scripts/sync-imessage.mjs --describe-images # Re-run AI descriptions
 */

import dotenv from 'dotenv';
import { join, basename, extname } from 'path';
import { existsSync, readFileSync, copyFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';

// Load env before other imports
dotenv.config({ path: join(import.meta.dirname, '..', '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { trackedBatchEmbedding, trackedCompletion } from './lib/llm-client.mjs';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'sync-imessage.mjs';
// Database path — override with IMESSAGE_DB_PATH env var if using a copy
const CHAT_DB_PATH = process.env.IMESSAGE_DB_PATH || join(homedir(), 'Library', 'Messages', 'chat.db');
const ATTACHMENTS_BASE = join(homedir(), 'Library', 'Messages', 'Attachments');

// macOS Core Data epoch: 2001-01-01 00:00:00 UTC
const APPLE_EPOCH_OFFSET = 978307200;

// Founder handles — phone numbers or Apple IDs
// Override with IMESSAGE_HANDLES env var (comma-separated)
const DEFAULT_HANDLES = [
  // Add founder phone numbers / Apple IDs here
  // e.g., '+61400000000', 'nick@example.com'
];

const FOUNDER_HANDLES = process.env.IMESSAGE_HANDLES
  ? process.env.IMESSAGE_HANDLES.split(',').map(h => h.trim())
  : DEFAULT_HANDLES;

// CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fullSync = args.includes('--full');
const statsOnly = args.includes('--stats');
const describeImages = args.includes('--describe-images');
const noImages = args.includes('--no-images');
const daysBack = (() => {
  const idx = args.indexOf('--days');
  return idx >= 0 ? parseInt(args[idx + 1]) : null;
})();

// Stats
const stats = {
  messagesRead: 0,
  messagesInserted: 0,
  messagesSkipped: 0,
  attachmentsFound: 0,
  attachmentsCopied: 0,
  imagesDescribed: 0,
  embeddingsGenerated: 0,
  errors: 0,
  startTime: Date.now(),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SQLite Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// openChatDb defined at bottom of file (async)

function appleTimestampToISO(appleNs) {
  if (!appleNs) return null;
  // Apple stores nanoseconds since 2001-01-01
  const unixSeconds = (appleNs / 1_000_000_000) + APPLE_EPOCH_OFFSET;
  return new Date(unixSeconds * 1000).toISOString();
}

// On macOS Ventura+, text may be in attributedBody blob instead of text column.
// The blob is an NSKeyedArchiver "streamtyped" format containing NSAttributedString.
// Text appears after the first NSString class marker + a length-prefixed string.
function extractTextFromAttributedBody(blob) {
  if (!blob || !(blob instanceof Buffer)) return null;
  try {
    // Strategy 1: Find the NSString marker followed by a '+' type byte and length-prefixed text.
    // Format: ...NSString\x01\x94\x84\x01\x2B<length_byte><text_bytes>...
    const nsStringMarker = Buffer.from('NSString');
    const idx = blob.indexOf(nsStringMarker);
    if (idx >= 0) {
      // Scan forward from NSString to find the 0x2B ('+') marker followed by text length
      const searchStart = idx + nsStringMarker.length;
      for (let i = searchStart; i < Math.min(searchStart + 20, blob.length - 2); i++) {
        if (blob[i] === 0x2B || blob[i] === 0x2A) {
          // Next byte(s) encode the length. For short strings it's a single byte.
          let textLen, textStart;
          if (blob[i] === 0x2B) {
            // 0x2B = UTF-8 string with 1-byte length
            textLen = blob[i + 1];
            textStart = i + 2;
          } else {
            // 0x2A = UTF-8 string with 2-byte length (big-endian) or 4-byte
            textLen = blob[i + 1];
            textStart = i + 2;
          }
          if (textLen > 0 && textStart + textLen <= blob.length) {
            const text = blob.slice(textStart, textStart + textLen).toString('utf-8');
            // Validate it looks like actual message text (not binary garbage)
            if (text.length > 0 && /[\w\s]/.test(text) && !/^[\x00-\x1f]+$/.test(text)) {
              return text.trim();
            }
          }
        }
      }
    }

    // Strategy 2: Fallback — split on null bytes, skip known Apple class names
    const appleClasses = new Set([
      'NSString', 'NSMutableString', 'NSAttributedString', 'NSObject',
      'NSDictionary', 'NSNumber', 'NSValue', 'NSArray', 'NSData',
      'streamtyped', '__kIMMessagePartAttributeName',
      '__kIMFileTransferGUIDAttributeName',
      '__kIMBaseWritingDirectionAttributeName',
      '__kIMDataDetectedAttributeName',
    ]);
    const str = blob.toString('utf-8');
    const segments = str.split(/[\x00-\x08\x0b\x0c\x0e-\x1f]+/)
      .map(s => s.replace(/^[^\x20-\x7e]+|[^\x20-\x7e]+$/g, '').trim())
      .filter(s => s.length > 1 && !appleClasses.has(s) && !/^[\x80-\xff]+$/.test(s));

    // Return the longest human-readable segment
    const textSegments = segments.filter(s =>
      s.length > 2 && /[a-zA-Z]/.test(s) && !s.startsWith('__kIM') && !s.startsWith('at_')
    );
    if (textSegments.length > 0) {
      return textSegments.sort((a, b) => b.length - a.length)[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Sync Logic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getSyncState() {
  const { data } = await supabase
    .from('sync_state')
    .select('*')
    .eq('id', 'imessage-sync')
    .single();
  return data;
}

async function updateSyncState(lastRowId, totalSynced) {
  await supabase
    .from('sync_state')
    .update({
      last_sync_token: String(lastRowId),
      last_sync_at: new Date().toISOString(),
      state: { last_rowid: lastRowId, total_synced: totalSynced },
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'imessage-sync');
}

function findFounderChatIds(db) {
  if (FOUNDER_HANDLES.length === 0) {
    console.error('No founder handles configured.');
    console.error('Set IMESSAGE_HANDLES env var or edit DEFAULT_HANDLES in script.');
    console.error('Run with --stats to list available chats.');
    process.exit(1);
  }

  // Find handle ROWIDs for the founders
  const placeholders = FOUNDER_HANDLES.map(() => '?').join(',');
  const handles = db.prepare(`
    SELECT ROWID, id
    FROM handle
    WHERE id IN (${placeholders})
  `).all(...FOUNDER_HANDLES);

  if (handles.length === 0) {
    console.error('No matching handles found in chat.db for:', FOUNDER_HANDLES);
    console.error('Run with --stats to see available handles.');
    process.exit(1);
  }

  console.log(`Found ${handles.length} founder handles:`);
  for (const h of handles) {
    console.log(`  ${h.id} (ROWID: ${h.ROWID})`);
  }

  // Find chats that include BOTH founders (or at least one if only one configured)
  const handleIds = handles.map(h => h.ROWID);
  const chatPlaceholders = handleIds.map(() => '?').join(',');

  // Get chats involving any of the founder handles
  const chatRows = db.prepare(`
    SELECT DISTINCT chj.chat_id
    FROM chat_handle_join chj
    WHERE chj.handle_id IN (${chatPlaceholders})
  `).all(...handleIds);

  const chatIds = chatRows.map(r => r.chat_id);
  console.log(`Found ${chatIds.length} chat(s) with founders`);
  return { chatIds, handles };
}

function fetchMessages(db, chatIds, sinceRowId, daysLimit) {
  if (chatIds.length === 0) return [];

  const chatPlaceholders = chatIds.map(() => '?').join(',');
  let whereClause = `cmj.chat_id IN (${chatPlaceholders})`;
  const params = [...chatIds];

  if (sinceRowId > 0 && !fullSync) {
    whereClause += ' AND m.ROWID > ?';
    params.push(sinceRowId);
  }

  if (daysLimit) {
    // Apple timestamp for N days ago
    const cutoff = ((Date.now() / 1000) - APPLE_EPOCH_OFFSET - (daysLimit * 86400)) * 1_000_000_000;
    whereClause += ' AND m.date > ?';
    params.push(cutoff);
  }

  const query = `
    SELECT
      m.ROWID as rowid,
      m.guid,
      m.text,
      m.attributedBody,
      m.date as apple_date,
      m.is_from_me,
      m.cache_has_attachments,
      m.associated_message_type,
      m.thread_originator_guid,
      h.id as handle_id,
      h.service
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
    WHERE ${whereClause}
    ORDER BY m.ROWID ASC
  `;

  return db.prepare(query).all(...params);
}

function fetchAttachments(db, messageRowIds) {
  if (messageRowIds.length === 0) return [];

  // SQLite has a limit on placeholders, batch if needed
  const results = [];
  const BATCH = 500;

  for (let i = 0; i < messageRowIds.length; i += BATCH) {
    const batch = messageRowIds.slice(i, i + BATCH);
    const placeholders = batch.map(() => '?').join(',');

    const rows = db.prepare(`
      SELECT
        maj.message_id as message_rowid,
        a.ROWID as attachment_rowid,
        a.guid as attachment_guid,
        a.filename,
        a.mime_type,
        a.total_bytes as file_size,
        a.transfer_name
      FROM message_attachment_join maj
      JOIN attachment a ON maj.attachment_id = a.ROWID
      WHERE maj.message_id IN (${placeholders})
        AND a.filename IS NOT NULL
    `).all(...batch);

    results.push(...rows);
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Image Description (Claude Vision)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function describeImage(filePath) {
  try {
    // Resolve ~ in path
    const resolvedPath = filePath.replace(/^~/, homedir());
    if (!existsSync(resolvedPath)) return null;

    // Convert HEIC to JPEG if needed
    let imagePath = resolvedPath;
    const ext = extname(resolvedPath).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      const tmpPath = `/tmp/imessage-convert-${Date.now()}.jpg`;
      try {
        execSync(`sips -s format jpeg "${resolvedPath}" --out "${tmpPath}" 2>/dev/null`);
        imagePath = tmpPath;
      } catch {
        return null; // Skip if conversion fails
      }
    }

    // Read as base64
    const imageData = readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const mediaType = ext === '.png' ? 'image/png'
      : ext === '.gif' ? 'image/gif'
      : 'image/jpeg';

    // Describe with OpenAI GPT-4o vision
    const messages = [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mediaType};base64,${base64}`,
            detail: 'low',
          },
        },
        {
          type: 'text',
          text: 'Describe this image concisely in 1-3 sentences. Focus on what it shows, any text visible, and context that would help recall this image later. If it\'s a screenshot, extract the key text content.',
        },
      ],
    }];

    const result = await trackedCompletion(messages, SCRIPT_NAME, {
      model: 'gpt-4o-mini',
      maxTokens: 300,
      operation: 'describe-image',
    });

    return result;
  } catch (err) {
    console.error(`  Failed to describe image: ${err.message}`);
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('=== iMessage Sync ===');
  if (dryRun) console.log('DRY RUN — no changes will be made');
  console.log('');

  // Open chat.db
  const db = await openChatDb();

  // Stats mode — show available chats
  if (statsOnly) {
    console.log('Available handles (contacts):');
    const handles = db.prepare('SELECT ROWID, id, service FROM handle ORDER BY id').all();
    for (const h of handles) {
      console.log(`  [${h.service}] ${h.id} (ROWID: ${h.ROWID})`);
    }

    console.log('');
    console.log('Recent chats:');
    const chats = db.prepare(`
      SELECT c.ROWID, c.chat_identifier, c.display_name, c.service_name,
        (SELECT COUNT(*) FROM chat_message_join cmj WHERE cmj.chat_id = c.ROWID) as msg_count
      FROM chat c
      ORDER BY c.ROWID DESC
      LIMIT 20
    `).all();
    for (const c of chats) {
      console.log(`  ${c.display_name || c.chat_identifier} [${c.service_name}] — ${c.msg_count} messages`);
    }

    const { count } = await supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'imessage');
    console.log(`\nSynced iMessages in Supabase: ${count || 0}`);

    db.close();
    process.exit(0);
  }

  // Get sync state
  const syncState = await getSyncState();
  const lastRowId = fullSync ? 0 : (syncState?.state?.last_rowid || parseInt(syncState?.last_sync_token || '0'));
  console.log(`Last synced ROWID: ${lastRowId}${fullSync ? ' (full sync requested)' : ''}`);

  // Find founder chats
  const { chatIds, handles } = findFounderChatIds(db);
  if (chatIds.length === 0) {
    console.log('No chats found with founder handles.');
    db.close();
    return;
  }

  // Fetch messages
  const messages = fetchMessages(db, chatIds, lastRowId, daysBack);
  stats.messagesRead = messages.length;
  console.log(`\nFetched ${messages.length} messages since ROWID ${lastRowId}`);

  if (messages.length === 0) {
    console.log('No new messages to sync.');
    db.close();
    return;
  }

  // Fetch attachments for messages that have them
  const messageRowIdsWithAttachments = messages
    .filter(m => m.cache_has_attachments)
    .map(m => m.rowid);
  const attachments = fetchAttachments(db, messageRowIdsWithAttachments);
  stats.attachmentsFound = attachments.length;
  console.log(`Found ${attachments.length} attachments`);

  // Group attachments by message ROWID
  const attachmentsByMessage = {};
  for (const a of attachments) {
    if (!attachmentsByMessage[a.message_rowid]) attachmentsByMessage[a.message_rowid] = [];
    attachmentsByMessage[a.message_rowid].push(a);
  }

  // Get existing source_ids for dedup
  const existingSourceIds = new Set();
  const { data: existingRows } = await supabase
    .from('communications_history')
    .select('source_id')
    .eq('source_system', 'imessage');
  if (existingRows) {
    for (const r of existingRows) existingSourceIds.add(r.source_id);
  }

  // Build handle lookup for direction detection
  const founderHandleSet = new Set(FOUNDER_HANDLES.map(h => h.toLowerCase()));

  // Process messages
  console.log('\nProcessing messages...');
  let maxRowId = lastRowId;
  const insertedCommIds = []; // Track for embedding
  const textsToEmbed = [];

  for (const msg of messages) {
    // Skip system/reaction messages
    if (msg.associated_message_type && msg.associated_message_type !== 0) {
      stats.messagesSkipped++;
      continue;
    }

    const sourceId = msg.guid;
    if (existingSourceIds.has(sourceId)) {
      stats.messagesSkipped++;
      maxRowId = Math.max(maxRowId, msg.rowid);
      continue;
    }

    // Extract text (handle Ventura+ attributedBody)
    let text = msg.text;
    if (!text && msg.attributedBody) {
      text = extractTextFromAttributedBody(msg.attributedBody);
    }
    // Strip any remaining binary/Apple marker artifacts from text
    if (text && (text.startsWith('__kIM') || text.startsWith('"__kIM'))) {
      text = null;
    }
    // Sanitize text for PostgreSQL — remove null bytes, object replacement chars, and other
    // invisible Unicode that Postgres rejects as "unsupported Unicode escape sequence"
    if (text) {
      text = text
        .replace(/\u0000/g, '')           // null bytes
        .replace(/\uFFFC/g, '')           // object replacement character (inline attachments)
        .replace(/[\uFFF0-\uFFFF]/g, '')  // specials block
        .replace(/[\uD800-\uDFFF]/g, '')  // lone surrogates
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars (keep \t \n \r)
        .trim();
      if (text.length === 0) text = null;
    }

    // Skip empty messages with no attachments
    if (!text && !attachmentsByMessage[msg.rowid]) {
      stats.messagesSkipped++;
      maxRowId = Math.max(maxRowId, msg.rowid);
      continue;
    }

    const occurredAt = appleTimestampToISO(msg.apple_date);
    const direction = msg.is_from_me ? 'outbound' : 'inbound';
    const contactHandle = msg.handle_id || 'unknown';

    // Build content preview (text + attachment summary)
    let contentPreview = text || '';
    const msgAttachments = attachmentsByMessage[msg.rowid] || [];
    if (msgAttachments.length > 0) {
      const attachSummary = msgAttachments.map(a =>
        `[${a.mime_type || 'attachment'}: ${a.transfer_name || basename(a.filename || 'file')}]`
      ).join(' ');
      if (contentPreview) contentPreview += ' ' + attachSummary;
      else contentPreview = attachSummary;
    }

    if (dryRun) {
      const preview = contentPreview.slice(0, 80).replace(/\n/g, ' ');
      console.log(`  [${direction}] ${occurredAt?.slice(0, 10)} ${preview}${contentPreview.length > 80 ? '...' : ''}`);
      stats.messagesInserted++;
      maxRowId = Math.max(maxRowId, msg.rowid);
      continue;
    }

    // Insert into communications_history
    const { data: inserted, error } = await supabase
      .from('communications_history')
      .insert({
        channel: 'imessage',
        direction,
        subject: null, // iMessages don't have subjects
        content_preview: contentPreview.slice(0, 2000), // Generous limit for iMessages
        source_system: 'imessage',
        source_id: sourceId,
        source_thread_id: msg.thread_originator_guid || null,
        occurred_at: occurredAt,
        synced_at: new Date().toISOString(),
        metadata: {
          handle: contactHandle,
          service: msg.service || 'iMessage',
          has_attachments: msgAttachments.length > 0,
          attachment_count: msgAttachments.length,
        },
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        stats.messagesSkipped++;
      } else {
        console.error(`  Error inserting: ${error.message}`);
        stats.errors++;
      }
    } else {
      stats.messagesInserted++;
      insertedCommIds.push(inserted.id);
      if (contentPreview.length > 5) {
        textsToEmbed.push({ id: inserted.id, text: contentPreview });
      }

      // Process attachments
      for (const att of msgAttachments) {
        const localPath = att.filename?.replace(/^~/, homedir());
        if (!localPath || !existsSync(localPath)) continue;

        const isImage = (att.mime_type || '').startsWith('image/');

        // Insert attachment record
        const { data: attRecord } = await supabase
          .from('imessage_attachments')
          .insert({
            communication_id: inserted.id,
            message_rowid: msg.rowid,
            filename: att.transfer_name || basename(att.filename || ''),
            mime_type: att.mime_type,
            file_size: att.file_size,
            local_path: att.filename, // Original path with ~
          })
          .select('id')
          .single();

        stats.attachmentsCopied++;

        // Describe images with AI (skip with --no-images)
        if (isImage && attRecord && !dryRun && !noImages) {
          const description = await describeImage(localPath);
          if (description) {
            await supabase
              .from('imessage_attachments')
              .update({ ai_description: description })
              .eq('id', attRecord.id);

            stats.imagesDescribed++;

            // Add description to embedding queue
            textsToEmbed.push({
              id: inserted.id,
              text: `[Image: ${att.transfer_name}] ${description}`,
              isAttachment: true,
              attachmentId: attRecord.id,
            });
          }
        }
      }
    }

    maxRowId = Math.max(maxRowId, msg.rowid);
  }

  db.close();

  // Generate embeddings for new messages
  if (!dryRun && textsToEmbed.length > 0) {
    console.log(`\nGenerating embeddings for ${textsToEmbed.length} items...`);

    const BATCH_SIZE = 20;
    for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
      const batch = textsToEmbed.slice(i, i + BATCH_SIZE);
      const texts = batch.map(t => t.text);

      try {
        const embeddings = await trackedBatchEmbedding(texts, SCRIPT_NAME);

        // Insert into knowledge_chunks
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const { error: chunkError } = await supabase
            .from('knowledge_chunks')
            .insert({
              content: item.text,
              embedding: embeddings[j],
              source_type: 'communication',
              source_id: item.id,
              metadata: {
                channel: 'imessage',
                is_attachment: item.isAttachment || false,
              },
            });

          if (chunkError && chunkError.code !== '23505') {
            console.error(`  Chunk error: ${chunkError.message}`);
          } else {
            stats.embeddingsGenerated++;
          }

          // Also update attachment embedding if applicable
          if (item.isAttachment && item.attachmentId) {
            await supabase
              .from('imessage_attachments')
              .update({ embedding: embeddings[j] })
              .eq('id', item.attachmentId);
          }
        }
      } catch (err) {
        console.error(`  Embedding batch error: ${err.message}`);
        stats.errors++;
      }
    }
  }

  // Update sync state
  if (!dryRun && maxRowId > lastRowId) {
    const prevTotal = syncState?.state?.total_synced || 0;
    await updateSyncState(maxRowId, prevTotal + stats.messagesInserted);
  }

  // Summary
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('');
  console.log('=== Summary ===');
  console.log(`Duration:          ${duration}s`);
  console.log(`Messages read:     ${stats.messagesRead}`);
  console.log(`Messages inserted: ${stats.messagesInserted}`);
  console.log(`Messages skipped:  ${stats.messagesSkipped}`);
  console.log(`Attachments found: ${stats.attachmentsFound}`);
  console.log(`Attachments saved: ${stats.attachmentsCopied}`);
  console.log(`Images described:  ${stats.imagesDescribed}`);
  console.log(`Embeddings:        ${stats.embeddingsGenerated}`);
  console.log(`Errors:            ${stats.errors}`);
  console.log(`Last ROWID:        ${maxRowId}`);
  if (dryRun) console.log('\nDRY RUN — no changes were made.');
  console.log('Done!');
}

async function openChatDb() {
  let Database;
  try {
    Database = (await import('better-sqlite3')).default;
  } catch {
    console.error('better-sqlite3 not installed. Run:');
    console.error('  cd /Users/benknight/Code/act-global-infrastructure && npm install better-sqlite3');
    process.exit(1);
  }

  if (!existsSync(CHAT_DB_PATH)) {
    console.error(`iMessage database not found at ${CHAT_DB_PATH}`);
    process.exit(1);
  }

  try {
    return new Database(CHAT_DB_PATH, { readonly: true, fileMustExist: true });
  } catch (err) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.error('');
      console.error('Cannot open iMessage database — Full Disk Access required.');
      console.error('');
      console.error('FIX: System Settings > Privacy & Security > Full Disk Access');
      console.error('     → Enable for Terminal (or your terminal app)');
      console.error('     → Restart terminal after granting access');
      console.error('');
      console.error('ALTERNATIVE: Copy the database manually and set IMESSAGE_DB_PATH:');
      console.error('  1. Open Finder > Go > Go to Folder > ~/Library/Messages/');
      console.error('  2. Copy chat.db to /tmp/chat.db');
      console.error('  3. Run: IMESSAGE_DB_PATH=/tmp/chat.db node scripts/sync-imessage.mjs --stats');
      console.error('');
      process.exit(1);
    }
    throw err;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
