/**
 * ACT Living Wiki - Notion Scanner
 *
 * Scans Notion workspace for knowledge to extract:
 * - New pages and updates
 * - Meeting notes
 * - Documentation pages
 * - Databases with processes
 *
 * Identifies potential Principles, Methods, Practices, and Procedures
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { embeddingService } from './embedding-service';

interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: any;
  parent: any;
  url: string;
}

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

interface KnowledgeExtraction {
  source_type: 'notion';
  source_id: string;
  source_url: string;
  source_title: string;
  raw_content: string;
  extracted_title?: string;
  extracted_content?: string;
  suggested_type?: string;
  suggested_tags?: string[];
  confidence_score?: number;
  content_embedding?: number[];
  metadata: any;
}

export class NotionScanner {
  private notion: Client;
  private supabase;
  private lastSyncKey = 'notion_last_sync';

  constructor(apiKey?: string) {
    const token = apiKey || process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;

    if (!token) {
      throw new Error('Notion API key required. Set NOTION_API_KEY or NOTION_TOKEN environment variable.');
    }

    this.notion = new Client({
      auth: token,
    });

    // Create Supabase client with environment variables
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Scan workspace for new/updated pages since last sync
   */
  async scanWorkspace(): Promise<KnowledgeExtraction[]> {
    console.log('🔍 Scanning Notion workspace for new knowledge...');

    try {
      // Get last sync time
      const lastSync = await this.getLastSyncTime();
      console.log(`📅 Last sync: ${lastSync.toISOString()}`);

      // Search for pages updated since last sync
      const pages = await this.searchRecentPages(lastSync);
      console.log(`📄 Found ${pages.length} updated pages`);

      // Extract knowledge from each page
      const extractions: KnowledgeExtraction[] = [];

      for (const page of pages) {
        const extraction = await this.extractFromPage(page);
        if (extraction) {
          extractions.push(extraction);
        }
      }

      // Update last sync time
      await this.updateLastSyncTime();

      console.log(`✅ Extracted ${extractions.length} knowledge items from Notion`);
      return extractions;
    } catch (error) {
      console.error('❌ Error scanning Notion workspace:', error);
      throw error;
    }
  }

  /**
   * Search for pages updated since a given date
   */
  private async searchRecentPages(since: Date): Promise<NotionPage[]> {
    const response = await this.notion.search({
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    // Filter by last_edited_time
    const recentPages = response.results.filter((page: any) => {
      const lastEdited = new Date(page.last_edited_time);
      return lastEdited > since;
    }) as NotionPage[];

    return recentPages;
  }

  /**
   * Extract knowledge from a Notion page
   */
  private async extractFromPage(page: NotionPage): Promise<KnowledgeExtraction | null> {
    try {
      // Get page title
      const title = this.getPageTitle(page);

      // Skip pages without titles or with certain keywords
      if (!title || this.shouldSkipPage(title)) {
        console.log(`⏭️  Skipping page: ${title || 'Untitled'}`);
        return null;
      }

      console.log(`📖 Processing: ${title}`);

      // Get page content (blocks)
      const blocks = await this.getPageBlocks(page.id);
      const content = this.blocksToMarkdown(blocks);

      // Skip if content is too short
      if (content.length < 100) {
        console.log(`⏭️  Skipping (too short): ${title}`);
        return null;
      }

      // Determine if this looks like knowledge worth extracting
      const knowledgeSignals = this.detectKnowledgeSignals(title, content);

      if (!knowledgeSignals.isKnowledge) {
        console.log(`⏭️  Skipping (not knowledge): ${title}`);
        return null;
      }

      // Calculate embedding-based confidence if OpenAI is configured
      let finalConfidence = knowledgeSignals.confidence;
      let embedding: number[] | undefined;

      if (embeddingService.isConfigured()) {
        try {
          console.log(`   🧮 Calculating embedding-based confidence...`);
          const result = await embeddingService.calculateConfidence(
            content,
            content, // For Notion, source = extracted (we're extracting the whole page)
            knowledgeSignals.suggestedType || 'guide'
          );

          finalConfidence = result.confidence;
          embedding = result.embedding;

          console.log(`   ✨ Confidence: ${Math.round(finalConfidence * 100)}% (similarity: ${Math.round(result.similarity * 100)}%)`);
        } catch (error) {
          console.warn(`   ⚠️  Embedding calculation failed, using keyword-based confidence:`, error);
          // Keep keyword-based confidence as fallback
        }
      } else {
        console.log(`   ⚠️  OpenAI not configured, using keyword-based confidence: ${Math.round(finalConfidence * 100)}%`);
      }

      return {
        source_type: 'notion',
        source_id: page.id,
        source_url: page.url,
        source_title: title,
        raw_content: content,
        suggested_type: knowledgeSignals.suggestedType,
        suggested_tags: knowledgeSignals.suggestedTags,
        confidence_score: finalConfidence,
        content_embedding: embedding,
        metadata: {
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          parent: page.parent,
        },
      };
    } catch (error) {
      console.error(`❌ Error extracting from page ${page.id}:`, error);
      return null;
    }
  }

  /**
   * Get page title from Notion page properties
   */
  private getPageTitle(page: NotionPage): string {
    try {
      const properties = page.properties;

      // Find title property (usually 'title' or 'Name')
      const titleProp = Object.values(properties).find(
        (prop: any) => prop.type === 'title'
      ) as any;

      if (!titleProp?.title?.[0]?.plain_text) {
        return '';
      }

      return titleProp.title[0].plain_text;
    } catch (error) {
      return '';
    }
  }

  /**
   * Get all blocks (content) from a page
   */
  private async getPageBlocks(pageId: string): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const response: any = await this.notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
      });

      blocks.push(...response.results);
      cursor = response.next_cursor;
    } while (cursor);

    return blocks;
  }

  /**
   * Convert Notion blocks to Markdown
   */
  private blocksToMarkdown(blocks: NotionBlock[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      const text = this.blockToMarkdown(block);
      if (text) {
        lines.push(text);
      }
    }

    return lines.join('\n\n');
  }

  /**
   * Convert a single Notion block to Markdown
   */
  private blockToMarkdown(block: NotionBlock): string {
    try {
      switch (block.type) {
        case 'paragraph':
          return this.richTextToMarkdown(block.paragraph?.rich_text || []);

        case 'heading_1':
          return `# ${this.richTextToMarkdown(block.heading_1?.rich_text || [])}`;

        case 'heading_2':
          return `## ${this.richTextToMarkdown(block.heading_2?.rich_text || [])}`;

        case 'heading_3':
          return `### ${this.richTextToMarkdown(block.heading_3?.rich_text || [])}`;

        case 'bulleted_list_item':
          return `- ${this.richTextToMarkdown(block.bulleted_list_item?.rich_text || [])}`;

        case 'numbered_list_item':
          return `1. ${this.richTextToMarkdown(block.numbered_list_item?.rich_text || [])}`;

        case 'quote':
          return `> ${this.richTextToMarkdown(block.quote?.rich_text || [])}`;

        case 'code':
          const code = this.richTextToMarkdown(block.code?.rich_text || []);
          const language = block.code?.language || '';
          return `\`\`\`${language}\n${code}\n\`\`\``;

        case 'callout':
          return `> 💡 ${this.richTextToMarkdown(block.callout?.rich_text || [])}`;

        case 'toggle':
          return this.richTextToMarkdown(block.toggle?.rich_text || []);

        default:
          return '';
      }
    } catch (error) {
      return '';
    }
  }

  /**
   * Convert Notion rich text to plain Markdown
   */
  private richTextToMarkdown(richText: any[]): string {
    return richText
      .map((text) => {
        let content = text.plain_text;

        // Apply formatting
        if (text.annotations?.bold) {
          content = `**${content}**`;
        }
        if (text.annotations?.italic) {
          content = `*${content}*`;
        }
        if (text.annotations?.code) {
          content = `\`${content}\``;
        }
        if (text.href) {
          content = `[${content}](${text.href})`;
        }

        return content;
      })
      .join('');
  }

  /**
   * Detect if page contains knowledge worth extracting
   */
  private detectKnowledgeSignals(title: string, content: string): {
    isKnowledge: boolean;
    suggestedType?: string;
    suggestedTags: string[];
    confidence: number;
  } {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    let confidence = 0;
    let suggestedType: string | undefined;
    const suggestedTags: string[] = [];

    // Principle indicators
    const principleKeywords = ['principle', 'value', 'belief', 'philosophy', 'why we', 'core to'];
    if (principleKeywords.some(kw => titleLower.includes(kw) || contentLower.includes(kw))) {
      confidence += 0.3;
      suggestedType = 'principle';
      suggestedTags.push('principles', 'values');
    }

    // Method indicators
    const methodKeywords = ['framework', 'approach', 'methodology', 'model', 'strategy'];
    if (methodKeywords.some(kw => titleLower.includes(kw) || contentLower.includes(kw))) {
      confidence += 0.3;
      suggestedType = suggestedType || 'method';
      suggestedTags.push('framework', 'methodology');
    }

    // Practice indicators
    const practiceKeywords = ['how we', 'our practice', 'we do this', 'regularly', 'routine', 'meeting'];
    if (practiceKeywords.some(kw => titleLower.includes(kw) || contentLower.includes(kw))) {
      confidence += 0.3;
      suggestedType = suggestedType || 'practice';
      suggestedTags.push('practice', 'operations');
    }

    // Procedure indicators
    const procedureKeywords = ['step', 'process', 'procedure', 'workflow', 'how to', 'guide', 'checklist'];
    if (procedureKeywords.some(kw => titleLower.includes(kw) || contentLower.includes(kw))) {
      confidence += 0.3;
      suggestedType = suggestedType || 'procedure';
      suggestedTags.push('process', 'guide');
    }

    // Template indicators
    const templateKeywords = ['template', 'format', 'example'];
    if (templateKeywords.some(kw => titleLower.includes(kw))) {
      confidence += 0.2;
      suggestedType = suggestedType || 'template';
      suggestedTags.push('template');
    }

    // Boost confidence if well-structured
    if (content.includes('##') || content.includes('###')) {
      confidence += 0.1; // Has headings
    }
    if (content.includes('- ') || content.includes('1. ')) {
      confidence += 0.1; // Has lists
    }

    // Default to guide if no specific type detected
    if (!suggestedType) {
      suggestedType = 'guide';
    }

    return {
      isKnowledge: confidence > 0.2,
      suggestedType,
      suggestedTags,
      confidence: Math.min(confidence, 1.0),
    };
  }

  /**
   * Check if page should be skipped based on title
   */
  private shouldSkipPage(title: string): boolean {
    const skipKeywords = [
      'untitled',
      'test',
      'scratch',
      'todo',
      'notes',
      'meeting notes', // Too informal for wiki
      'personal',
      'draft',
    ];

    const titleLower = title.toLowerCase();
    return skipKeywords.some(kw => titleLower === kw || titleLower.startsWith(kw));
  }

  /**
   * Get last sync time from database
   */
  private async getLastSyncTime(): Promise<Date> {
    const { data } = await this.supabase
      .from('knowledge_source_sync')
      .select('last_sync_at')
      .eq('source_type', 'notion')
      .single();

    if (data?.last_sync_at) {
      return new Date(data.last_sync_at);
    }

    // Default to 7 days ago if no previous sync
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo;
  }

  /**
   * Update last sync time in database
   */
  private async updateLastSyncTime(): Promise<void> {
    const now = new Date().toISOString();

    await this.supabase
      .from('knowledge_source_sync')
      .upsert({
        source_type: 'notion',
        last_sync_at: now,
        next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        status: 'completed',
        items_found: 0, // Will be updated by caller
      });
  }

  /**
   * Save extractions to queue for review
   */
  async saveToQueue(extractions: KnowledgeExtraction[]): Promise<void> {
    console.log(`💾 Saving ${extractions.length} extractions to review queue...`);

    const records = extractions.map(ext => ({
      source_type: ext.source_type,
      source_id: ext.source_id,
      source_url: ext.source_url,
      raw_title: ext.source_title,
      raw_content: ext.raw_content,
      suggested_type: ext.suggested_type,
      suggested_tags: ext.suggested_tags,
      confidence_score: ext.confidence_score,
      content_embedding: ext.content_embedding && ext.content_embedding.length > 0 ? ext.content_embedding : null,
      source_metadata: ext.metadata,
      status: 'pending',
    }));

    // Insert records, skipping duplicates
    // Note: Can't use upsert due to partial unique index with WHERE clause
    const { error } = await this.supabase
      .from('knowledge_extraction_queue')
      .insert(records)
      .select();

    // If duplicate error, that's OK - items already in queue
    if (error && error.code === '23505') {
      console.log('   ℹ️  Some items already in queue (duplicates skipped)');
      // Don't throw - this is expected
    } else if (error) {
      console.error('❌ Error saving to queue:', error);
      throw error;
    }

    console.log('✅ Saved to review queue');
  }

  /**
   * Run AI extraction on queued items (using existing AI endpoint)
   */
  async runAIExtraction(queueId: string): Promise<void> {
    // Get queue item
    const { data: queueItem } = await this.supabase
      .from('knowledge_extraction_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    // Call AI generation API
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Extract knowledge from this Notion page:\n\nTitle: ${queueItem.source_title}\n\nContent:\n${queueItem.raw_content}`,
        type: 'wiki_extraction',
        project: 'act-wiki',
      }),
    });

    const result = await response.json();

    // Update queue item with AI extraction
    await this.supabase
      .from('knowledge_extraction_queue')
      .update({
        extracted_title: result.title,
        extracted_content: result.content,
        suggested_type: result.type,
        suggested_tags: result.tags,
        confidence_score: result.confidence,
        status: 'extracted',
      })
      .eq('id', queueId);
  }
}

/**
 * Helper function to run Notion scan from API route or cron job
 */
export async function runNotionScan(): Promise<{
  scanned: number;
  extracted: number;
  queued: number;
}> {
  const scanner = new NotionScanner();

  // Scan workspace
  const extractions = await scanner.scanWorkspace();

  // Save to queue
  await scanner.saveToQueue(extractions);

  return {
    scanned: extractions.length,
    extracted: extractions.length,
    queued: extractions.length,
  };
}
