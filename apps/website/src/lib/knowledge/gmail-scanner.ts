/**
 * Gmail Knowledge Scanner
 * Extracts knowledge from Gmail emails using similar patterns to Notion scanner
 */

import { google } from 'googleapis';
import { getAuthenticatedClient } from '../gmail/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import pLimit from 'p-limit';

// Rate limiting: Gmail API allows ~250 quota units/second
// Each message.get costs 5 units, so limit to ~30 concurrent requests
const limit = pLimit(30);

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
  labels: string[];
}

interface KnowledgeExtraction {
  source_type: 'gmail';
  source_id: string;
  source_url: string;
  raw_title: string;
  raw_content: string;
  suggested_type?: string;
  suggested_tags?: string[];
  confidence_score?: number;
  source_metadata: any;
  thread_id: string;
}

export class GmailScanner {
  private supabase: any;

  constructor() {
    const client = getSupabaseServerClient();
    if (!client) {
      throw new Error('Supabase client not configured');
    }
    this.supabase = client;
  }

  /**
   * Scan Gmail inbox for knowledge (incremental sync using History API)
   */
  async scanInbox(userEmail: string): Promise<KnowledgeExtraction[]> {
    console.log(`📧 Scanning Gmail for ${userEmail}...`);

    try {
      // Get authenticated Gmail client
      const auth = await getAuthenticatedClient(userEmail);
      const gmail = google.gmail({ version: 'v1', auth });

      // Get account ID
      const { data: account } = await this.supabase
        .from('gmail_auth_tokens')
        .select('id')
        .eq('user_email', userEmail)
        .single();

      if (!account) {
        throw new Error(`No account found for ${userEmail}`);
      }

      const accountId = account.id;

      // Update sync state to 'running'
      await this.updateSyncState(accountId, { status: 'running' });

      // Get sync state
      const { data: syncState } = await this.supabase
        .from('gmail_sync_state')
        .select('last_history_id')
        .eq('account_id', accountId)
        .single();

      const lastHistoryId = syncState?.last_history_id;

      let messageIds: string[] = [];
      let newHistoryId: string | null = null;

      if (lastHistoryId) {
        // Incremental sync using History API
        console.log(`🔄 Incremental sync from history ${lastHistoryId}`);
        const historyResult = await this.getHistoryChanges(gmail, lastHistoryId);
        messageIds = historyResult.messageIds;
        newHistoryId = historyResult.historyId;
      } else {
        // First sync - get recent messages
        console.log(`📥 First sync - fetching recent messages`);
        const messagesResult = await this.getRecentMessages(gmail);
        messageIds = messagesResult.messageIds;
        newHistoryId = messagesResult.historyId;
      }

      console.log(`📬 Found ${messageIds.length} new messages`);

      // Fetch and extract knowledge from messages
      const extractions: KnowledgeExtraction[] = [];

      for (const messageId of messageIds) {
        const extraction = await limit(async () =>
          this.extractFromMessage(gmail, messageId)
        );

        if (extraction) {
          extractions.push(extraction);
        }
      }

      console.log(`✅ Extracted ${extractions.length} knowledge items from ${messageIds.length} messages`);

      // Update sync state
      await this.updateSyncState(accountId, {
        status: 'completed',
        last_history_id: newHistoryId,
        items_found: messageIds.length,
        items_extracted: extractions.length,
      });

      return extractions;
    } catch (error: any) {
      console.error('❌ Error scanning Gmail:', error);

      // Try to update sync state with error
      try {
        const { data: account } = await this.supabase
          .from('gmail_auth_tokens')
          .select('id')
          .eq('user_email', userEmail)
          .single();

        if (account) {
          await this.updateSyncState(account.id, {
            status: 'error',
            error_message: error.message,
          });
        }
      } catch (updateError) {
        console.error('Failed to update sync state:', updateError);
      }

      throw error;
    }
  }

  /**
   * Get history changes using Gmail History API
   */
  private async getHistoryChanges(gmail: any, startHistoryId: string): Promise<{
    messageIds: string[];
    historyId: string | null;
  }> {
    try {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],  // Only new messages
      });

      const histories = response.data.history || [];
      const messageIds = histories
        .flatMap((h: any) => h.messagesAdded || [])
        .map((m: any) => m.message.id);

      return {
        messageIds,
        historyId: response.data.historyId || null,
      };
    } catch (error: any) {
      // 404 means historyId is too old (>1 week typically)
      if (error.code === 404) {
        console.log('⚠️  History too old, falling back to full scan');
        return this.getRecentMessages(gmail);
      }
      throw error;
    }
  }

  /**
   * Get recent messages (fallback for first sync or old history)
   */
  private async getRecentMessages(gmail: any): Promise<{
    messageIds: string[];
    historyId: string | null;
  }> {
    // Get current historyId
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const historyId = profile.data.historyId;

    // Build query to filter for knowledge-worthy emails
    const query = this.buildKnowledgeQuery();

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,  // Limit for first scan
      q: query,
    });

    const messageIds = (response.data.messages || []).map((m: any) => m.id);

    return {
      messageIds,
      historyId,
    };
  }

  /**
   * Build Gmail query to filter for knowledge-worthy emails
   */
  private buildKnowledgeQuery(): string {
    const parts: string[] = [];

    // Date filter: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = this.formatGmailDate(thirtyDaysAgo);
    parts.push(`after:${dateStr}`);

    // Exclude automated emails
    parts.push('-from:noreply');
    parts.push('-from:no-reply');
    parts.push('-from:notifications');

    // Look for knowledge keywords
    const keywords = [
      'decision',
      'agreed',
      'process',
      'procedure',
      'guideline',
      'policy',
      'framework',
      'workflow',
      'meeting notes',
      'action items',
    ];
    const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');
    parts.push(`(${keywordQuery})`);

    return parts.join(' ');
  }

  /**
   * Format date for Gmail API (YYYY/MM/DD)
   */
  private formatGmailDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Extract knowledge from a single Gmail message
   */
  private async extractFromMessage(
    gmail: any,
    messageId: string
  ): Promise<KnowledgeExtraction | null> {
    try {
      // Fetch full message
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = this.parseMessage(response.data);

      // Filter: Skip if not knowledge-worthy
      if (!this.isKnowledgeWorthy(message)) {
        console.log(`⏭️  Skipping: ${message.subject}`);
        return null;
      }

      console.log(`📖 Processing: ${message.subject}`);

      // Detect knowledge signals
      const knowledgeSignals = this.detectKnowledgeSignals(message);

      if (!knowledgeSignals.isKnowledge) {
        console.log(`⏭️  Not knowledge: ${message.subject}`);
        return null;
      }

      return {
        source_type: 'gmail',
        source_id: message.id,
        source_url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
        raw_title: message.subject,
        raw_content: this.formatEmailAsMarkdown(message),
        suggested_type: knowledgeSignals.suggestedType,
        suggested_tags: knowledgeSignals.suggestedTags,
        confidence_score: knowledgeSignals.confidence,
        source_metadata: {
          thread_id: message.threadId,
          from: message.from,
          to: message.to,
          date: message.date,
          labels: message.labels,
          account_id: '', // Will be set when saving
        },
        thread_id: message.threadId,
      };
    } catch (error) {
      console.error(`❌ Error extracting from message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Parse Gmail API message into structured format
   */
  private parseMessage(apiMessage: any): GmailMessage {
    const headers = apiMessage.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: apiMessage.id,
      threadId: apiMessage.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      body: this.extractBody(apiMessage.payload),
      snippet: apiMessage.snippet,
      labels: apiMessage.labelIds || [],
    };
  }

  /**
   * Extract email body from message payload
   */
  private extractBody(payload: any): string {
    let body = '';

    // Simple text/plain body
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Multipart message
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && !body && part.body?.data) {
          // Fallback to HTML if no plain text
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          body = this.htmlToText(html);
        } else if (part.parts) {
          // Recursive for nested parts
          body += this.extractBody(part);
        }
      }
    }

    return body;
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if message is worth extracting knowledge from
   */
  private isKnowledgeWorthy(message: GmailMessage): boolean {
    const subject = message.subject.toLowerCase();
    const body = message.body.toLowerCase();

    // Skip automated emails
    const automatedSenders = [
      'noreply',
      'no-reply',
      'notifications',
      'calendar-notification',
      'donotreply',
    ];
    if (automatedSenders.some(s => message.from.toLowerCase().includes(s))) {
      return false;
    }

    // Skip if too short
    if (message.body.length < 200) {
      return false;
    }

    // Look for knowledge indicators
    const knowledgeKeywords = [
      'decision',
      'agreed',
      'approach',
      'process',
      'procedure',
      'guideline',
      'policy',
      'framework',
      'best practice',
      'how we',
      'our practice',
      'workflow',
      'template',
      'meeting notes',
      'action items',
    ];

    return knowledgeKeywords.some(
      kw => subject.includes(kw) || body.includes(kw)
    );
  }

  /**
   * Detect knowledge signals in email (similar to Notion scanner)
   */
  private detectKnowledgeSignals(message: GmailMessage): {
    isKnowledge: boolean;
    suggestedType?: string;
    suggestedTags: string[];
    confidence: number;
  } {
    const subject = message.subject.toLowerCase();
    const body = message.body.toLowerCase();
    let confidence = 0;
    let suggestedType: string | undefined;
    const suggestedTags: string[] = ['email'];

    // Decision indicators
    if (
      subject.includes('decision') ||
      body.includes('we agreed') ||
      body.includes('decided to') ||
      body.includes('going with')
    ) {
      confidence += 0.4;
      suggestedType = 'principle';
      suggestedTags.push('decisions');
    }

    // Process/Procedure indicators
    if (
      subject.includes('process') ||
      subject.includes('procedure') ||
      subject.includes('workflow') ||
      body.includes('step 1') ||
      body.includes('first,')
    ) {
      confidence += 0.3;
      suggestedType = suggestedType || 'procedure';
      suggestedTags.push('process');
    }

    // Planning indicators
    if (
      subject.includes('planning') ||
      subject.includes('roadmap') ||
      subject.includes('strategy')
    ) {
      confidence += 0.3;
      suggestedType = suggestedType || 'method';
      suggestedTags.push('planning');
    }

    // Meeting summary indicators
    if (
      subject.includes('meeting') ||
      subject.includes('sync') ||
      body.includes('action items') ||
      body.includes('next steps')
    ) {
      confidence += 0.2;
      suggestedType = suggestedType || 'practice';
      suggestedTags.push('meetings');
    }

    return {
      isKnowledge: confidence > 0.3,
      suggestedType: suggestedType || 'guide',
      suggestedTags,
      confidence: Math.min(confidence, 1.0),
    };
  }

  /**
   * Format email as markdown
   */
  private formatEmailAsMarkdown(message: GmailMessage): string {
    return `# ${message.subject}

**From**: ${message.from}
**To**: ${message.to}
**Date**: ${message.date}

---

${message.body}
`;
  }

  /**
   * Save extractions to queue (same pattern as Notion scanner)
   */
  async saveToQueue(extractions: KnowledgeExtraction[], accountId: string): Promise<void> {
    console.log(`💾 Saving ${extractions.length} Gmail extractions to queue...`);

    const records = extractions.map(ext => ({
      source_type: ext.source_type,
      source_id: ext.source_id,
      source_url: ext.source_url,
      raw_title: ext.raw_title,
      raw_content: ext.raw_content,
      suggested_type: ext.suggested_type,
      suggested_tags: ext.suggested_tags,
      confidence_score: ext.confidence_score,
      source_metadata: { ...ext.source_metadata, account_id: accountId },
      thread_id: ext.thread_id,
      status: 'pending',
    }));

    const { error } = await this.supabase
      .from('knowledge_extraction_queue')
      .insert(records);

    if (error) {
      // Ignore unique constraint violations (duplicates)
      if (error.code === '23505') {
        console.log('⚠️  Some messages already in queue (skipped duplicates)');
        return;
      }
      console.error('❌ Error saving to queue:', error);
      throw error;
    }

    console.log('✅ Saved to review queue');
  }

  /**
   * Update Gmail sync state
   */
  private async updateSyncState(accountId: string, state: {
    status?: string;
    last_history_id?: string | null;
    items_found?: number;
    items_extracted?: number;
    error_message?: string;
  }): Promise<void> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (state.status) updates.status = state.status;
    if (state.last_history_id !== undefined) updates.last_history_id = state.last_history_id;
    if (state.items_found !== undefined) updates.items_found = state.items_found;
    if (state.items_extracted !== undefined) updates.items_extracted = state.items_extracted;
    if (state.error_message !== undefined) updates.error_message = state.error_message;

    if (state.status === 'completed') {
      updates.last_sync_at = new Date().toISOString();
      updates.next_sync_at = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    }

    await this.supabase
      .from('gmail_sync_state')
      .upsert({
        account_id: accountId,
        ...updates,
      }, {
        onConflict: 'account_id'
      });
  }
}

/**
 * Helper function to run Gmail scan
 */
export async function runGmailScan(userEmail: string): Promise<{
  scanned: number;
  extracted: number;
  queued: number;
}> {
  const scanner = new GmailScanner();
  const extractions = await scanner.scanInbox(userEmail);

  // Get account ID for saving
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  const { data: account } = await supabase
    .from('gmail_auth_tokens')
    .select('id')
    .eq('user_email', userEmail)
    .single();

  if (!account) {
    throw new Error(`No account found for ${userEmail}`);
  }

  await scanner.saveToQueue(extractions, account.id);

  return {
    scanned: extractions.length,
    extracted: extractions.length,
    queued: extractions.length,
  };
}
