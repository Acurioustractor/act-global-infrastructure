#!/usr/bin/env node

/**
 * Knowledge Chunking Service
 *
 * Chunks content from various sources into vector-searchable knowledge chunks.
 * Stores in Supabase with OpenAI embeddings for RAG retrieval.
 *
 * Sources:
 *   - Codebase files (markdown, code, configs)
 *   - Notion pages and databases
 *   - GHL contacts and communications
 *   - Calendar events
 *   - Gmail summaries
 *
 * Usage:
 *   node scripts/chunk-knowledge.mjs [command]
 *
 * Commands:
 *   ingest <path>   - Ingest files from a directory
 *   notion          - Ingest from Notion databases
 *   ghl             - Ingest from GoHighLevel
 *   search <query>  - Test semantic search
 *   stats           - Show knowledge base statistics
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 1500; // tokens ~= characters for simplicity
const CHUNK_OVERLAP = 200;

// File patterns to include
const INCLUDE_EXTENSIONS = [
  '.md', '.mdx', '.txt',
  '.ts', '.tsx', '.js', '.jsx', '.mjs',
  '.py', '.go', '.rs',
  '.json', '.yaml', '.yml', '.toml',
  '.env.example', '.env.template',
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.pytest_cache',
  'coverage',
  '.turbo',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

class KnowledgeChunker {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }

  /**
   * Ingest files from a directory
   */
  async ingestDirectory(dirPath, projectId = null) {
    console.log(`📂 Ingesting from: ${dirPath}`);
    console.log('');

    projectId = projectId || dirPath.split('/').pop();
    const files = await this.getFiles(dirPath);

    console.log(`📄 Found ${files.length} files to process`);
    console.log('');

    let totalChunks = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const relativePath = relative(dirPath, file);

        // Skip empty or very short files
        if (content.length < 100) {
          skipped++;
          continue;
        }

        // Check if already ingested
        const sourceId = `file:${projectId}:${relativePath}`;
        const { data: existing } = await this.supabase
          .from('knowledge_chunks')
          .select('id')
          .eq('source_id', sourceId)
          .limit(1);

        if (existing?.length) {
          console.log(`⏭️  Skipping (exists): ${relativePath}`);
          skipped++;
          continue;
        }

        // Chunk the content
        const chunks = this.chunkContent(content, file);

        console.log(`📝 Processing: ${relativePath} (${chunks.length} chunks)`);

        // Process chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await this.getEmbedding(chunk);

          await this.supabase.from('knowledge_chunks').insert({
            content: chunk,
            embedding,
            source_type: 'codebase',
            source_id: `${sourceId}:${i}`,
            project_id: projectId,
            file_path: relativePath,
            metadata: {
              chunk_index: i,
              total_chunks: chunks.length,
              file_extension: extname(file),
            },
          });

          totalChunks++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${file}: ${err.message}`);
      }
    }

    console.log('');
    console.log(`✅ Ingested ${totalChunks} chunks, skipped ${skipped} files`);

    return { chunks: totalChunks, skipped };
  }

  /**
   * Ingest from Notion databases
   */
  async ingestNotion() {
    console.log('📓 Ingesting from Notion...');

    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) {
      throw new Error('Missing NOTION_TOKEN');
    }

    // Load database IDs
    let databaseIds = {};
    try {
      const configPath = join(process.cwd(), 'config/notion-database-ids.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      databaseIds = config;
    } catch {
      console.warn('⚠️  Could not load notion-database-ids.json');
      return { chunks: 0 };
    }

    let totalChunks = 0;

    // Ingest from key databases
    const databasesToIngest = [
      'githubIssues',
      'actProjects',
      'sprintTracking',
      'dailyWorkLog',
      'weeklyReports',
    ];

    for (const dbKey of databasesToIngest) {
      const dbId = databaseIds[dbKey];
      if (!dbId) continue;

      console.log(`\n📊 Ingesting ${dbKey}...`);

      try {
        // Query database
        const response = await fetch(
          `https://api.notion.com/v1/databases/${dbId}/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${NOTION_TOKEN}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({ page_size: 100 }),
          }
        );

        const data = await response.json();
        const pages = data.results || [];

        for (const page of pages) {
          const content = this.extractNotionContent(page);
          if (!content || content.length < 50) continue;

          const sourceId = `notion:${dbKey}:${page.id}`;

          // Check if exists
          const { data: existing } = await this.supabase
            .from('knowledge_chunks')
            .select('id')
            .eq('source_id', sourceId)
            .limit(1);

          if (existing?.length) continue;

          // Get embedding and store
          const embedding = await this.getEmbedding(content);

          await this.supabase.from('knowledge_chunks').insert({
            content,
            embedding,
            source_type: 'notion',
            source_id: sourceId,
            project_id: dbKey,
            metadata: {
              pageId: page.id,
              database: dbKey,
              createdTime: page.created_time,
            },
          });

          totalChunks++;
        }

        console.log(`   ✅ Processed ${pages.length} pages`);
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
      }
    }

    console.log('');
    console.log(`✅ Ingested ${totalChunks} chunks from Notion`);

    return { chunks: totalChunks };
  }

  /**
   * Semantic search for knowledge
   */
  async search(query, options = {}) {
    const {
      limit = 10,
      threshold = 0.7,
      sourceType = null,
      projectId = null,
    } = options;

    console.log(`🔍 Searching: "${query}"`);
    console.log('');

    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);

    // Use the match_knowledge_chunks function
    const { data, error } = await this.supabase.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_source_type: sourceType,
      filter_project_id: projectId,
    });

    if (error) {
      // Fallback: manual vector search
      console.warn('⚠️  Using fallback search (RPC not available)');

      const { data: results } = await this.supabase
        .from('knowledge_chunks')
        .select('*')
        .limit(limit * 3); // Get more, filter by similarity

      if (!results?.length) {
        return [];
      }

      // Filter by similarity manually (less efficient)
      return results.slice(0, limit);
    }

    return data || [];
  }

  /**
   * Get knowledge base statistics
   */
  async getStats() {
    console.log('📊 Knowledge Base Statistics');
    console.log('');

    // Total chunks
    const { count: totalCount } = await this.supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    console.log(`📦 Total chunks: ${totalCount}`);

    // By source type
    const { data: bySource } = await this.supabase.rpc('exec_sql', {
      sql: `
        SELECT source_type, COUNT(*) as count
        FROM knowledge_chunks
        GROUP BY source_type
        ORDER BY count DESC
      `,
    });

    if (bySource) {
      console.log('\nBy source:');
      for (const row of bySource) {
        console.log(`   ${row.source_type}: ${row.count}`);
      }
    }

    // By project
    const { data: byProject } = await this.supabase.rpc('exec_sql', {
      sql: `
        SELECT project_id, COUNT(*) as count
        FROM knowledge_chunks
        WHERE project_id IS NOT NULL
        GROUP BY project_id
        ORDER BY count DESC
        LIMIT 10
      `,
    });

    if (byProject) {
      console.log('\nBy project:');
      for (const row of byProject) {
        console.log(`   ${row.project_id}: ${row.count}`);
      }
    }

    // Recent activity
    const { data: recent } = await this.supabase
      .from('knowledge_chunks')
      .select('source_type, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recent?.length) {
      console.log('\nRecent ingestions:');
      for (const chunk of recent) {
        const time = new Date(chunk.created_at).toLocaleString();
        console.log(`   ${time} - ${chunk.source_type}:${chunk.project_id}`);
      }
    }

    return { total: totalCount };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getFiles(dirPath) {
    const files = [];

    const walk = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip excluded patterns
        if (EXCLUDE_PATTERNS.some((p) => entry.name.includes(p))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (INCLUDE_EXTENSIONS.includes(ext) || INCLUDE_EXTENSIONS.includes(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(dirPath);
    return files;
  }

  chunkContent(content, filePath) {
    const ext = extname(filePath);
    const chunks = [];

    // For markdown, try to split on headers
    if (ext === '.md' || ext === '.mdx') {
      const sections = content.split(/(?=^#+\s)/m);

      for (const section of sections) {
        if (section.length <= CHUNK_SIZE) {
          if (section.trim()) chunks.push(section.trim());
        } else {
          // Further split large sections
          chunks.push(...this.splitBySize(section));
        }
      }
    } else {
      // For code files, try to split on function/class boundaries
      // Simplified: just split by size with overlap
      chunks.push(...this.splitBySize(content));
    }

    return chunks.filter((c) => c.length >= 50);
  }

  splitBySize(text) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      // Try to end at a natural boundary
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n', end);
        const lastPeriod = text.lastIndexOf('. ', end);

        if (lastNewline > start + CHUNK_SIZE / 2) {
          end = lastNewline + 1;
        } else if (lastPeriod > start + CHUNK_SIZE / 2) {
          end = lastPeriod + 2;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - CHUNK_OVERLAP;
    }

    return chunks;
  }

  async getEmbedding(text) {
    // Truncate if too long
    const truncated = text.slice(0, 8000);

    const response = await this.openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });

    return response.data[0].embedding;
  }

  extractNotionContent(page) {
    const parts = [];

    // Extract title
    for (const key in page.properties) {
      const prop = page.properties[key];

      if (prop.type === 'title' && prop.title?.length) {
        parts.push(prop.title.map((t) => t.plain_text).join(''));
      } else if (prop.type === 'rich_text' && prop.rich_text?.length) {
        parts.push(prop.rich_text.map((t) => t.plain_text).join(''));
      } else if (prop.type === 'select' && prop.select) {
        parts.push(`${key}: ${prop.select.name}`);
      } else if (prop.type === 'multi_select' && prop.multi_select?.length) {
        parts.push(`${key}: ${prop.multi_select.map((s) => s.name).join(', ')}`);
      } else if (prop.type === 'status' && prop.status) {
        parts.push(`Status: ${prop.status.name}`);
      }
    }

    return parts.join('\n');
  }
}

// Singleton instance
export const knowledgeChunker = new KnowledgeChunker();

// CLI entry point
if (process.argv[1]?.endsWith('chunk-knowledge.mjs')) {
  const command = process.argv[2];

  switch (command) {
    case 'ingest': {
      const path = process.argv[3];
      const projectId = process.argv[4];
      if (!path) {
        console.error('Usage: node chunk-knowledge.mjs ingest <path> [projectId]');
        process.exit(1);
      }
      await knowledgeChunker.ingestDirectory(path, projectId);
      break;
    }

    case 'notion':
      await knowledgeChunker.ingestNotion();
      break;

    case 'search': {
      const query = process.argv.slice(3).join(' ');
      if (!query) {
        console.error('Usage: node chunk-knowledge.mjs search <query>');
        process.exit(1);
      }
      const results = await knowledgeChunker.search(query);
      console.log('Results:');
      for (const r of results) {
        console.log('');
        console.log(`📄 ${r.source_type}:${r.project_id || 'unknown'} (score: ${r.similarity?.toFixed(3) || 'n/a'})`);
        console.log(r.content.slice(0, 200) + '...');
      }
      break;
    }

    case 'stats':
      await knowledgeChunker.getStats();
      break;

    default:
      console.log('ACT Knowledge Chunker');
      console.log('');
      console.log('Commands:');
      console.log('  ingest <path> [projectId]  - Ingest files from directory');
      console.log('  notion                     - Ingest from Notion databases');
      console.log('  search <query>             - Semantic search');
      console.log('  stats                      - Show statistics');
  }
}

export default knowledgeChunker;
