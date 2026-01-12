#!/usr/bin/env node

/**
 * ACT Knowledge Hub - Supabase Schema Setup
 *
 * Creates the unified knowledge tables for the ACT AI Operating System:
 * - knowledge_chunks: Vector-enabled content chunks for RAG
 * - entity_relationships: Relationship tracking between entities
 * - contact_communications: Communication history from GHL/Gmail/Calendar
 * - conversation_context: Chatbot and voice session memory
 *
 * Prerequisites:
 *   - pgvector extension enabled in Supabase
 *   - SUPABASE_SERVICE_ROLE_KEY set in .env.local
 *
 * Usage:
 *   node scripts/setup-knowledge-tables.mjs
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// SQL statements for schema setup
const SCHEMA_SQL = {
  // Enable pgvector extension
  enableVector: `CREATE EXTENSION IF NOT EXISTS vector;`,

  // Knowledge chunks with vector embeddings
  knowledgeChunks: `
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding VECTOR(1536),
      source_type TEXT NOT NULL CHECK (source_type IN ('codebase', 'notion', 'ghl', 'email', 'calendar', 'manual')),
      source_id TEXT,
      project_id TEXT,
      file_path TEXT,
      metadata JSONB DEFAULT '{}',
      confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,

  knowledgeChunksIndex: `
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
    ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
  `,

  knowledgeChunksSourceIndex: `
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source
    ON knowledge_chunks (source_type, project_id);
  `,

  // Entity relationships (contacts, projects, opportunities)
  entityRelationships: `
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document')),
      entity_id TEXT NOT NULL,
      related_entity_type TEXT NOT NULL CHECK (related_entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document')),
      related_entity_id TEXT NOT NULL,
      relationship_type TEXT CHECK (relationship_type IN ('works_on', 'knows', 'owns', 'related_to', 'depends_on', 'blocks', 'parent_of', 'child_of')),
      strength_score FLOAT DEFAULT 0.5 CHECK (strength_score >= 0 AND strength_score <= 1),
      last_interaction TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (entity_type, entity_id, related_entity_type, related_entity_id, relationship_type)
    );
  `,

  entityRelationshipsIndex: `
    CREATE INDEX IF NOT EXISTS idx_entity_relationships_entity
    ON entity_relationships (entity_type, entity_id);
  `,

  // Contact communication history
  contactCommunications: `
    CREATE TABLE IF NOT EXISTS contact_communications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ghl_contact_id TEXT NOT NULL,
      comm_type TEXT NOT NULL CHECK (comm_type IN ('email', 'call', 'meeting', 'sms', 'chat', 'note')),
      direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
      subject TEXT,
      summary TEXT,
      full_content TEXT,
      sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
      topics TEXT[],
      action_items TEXT[],
      occurred_at TIMESTAMPTZ NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('ghl', 'gmail', 'calendar', 'manual')),
      source_id TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,

  contactCommunicationsIndex: `
    CREATE INDEX IF NOT EXISTS idx_contact_communications_contact
    ON contact_communications (ghl_contact_id, occurred_at DESC);
  `,

  contactCommunicationsDateIndex: `
    CREATE INDEX IF NOT EXISTS idx_contact_communications_date
    ON contact_communications (occurred_at DESC);
  `,

  // Conversation context for chatbot/voice sessions
  conversationContext: `
    CREATE TABLE IF NOT EXISTS conversation_context (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      user_id TEXT,
      interface TEXT NOT NULL CHECK (interface IN ('chatbot', 'voice', 'claude_code', 'notion_ai')),
      site TEXT DEFAULT 'act-farm',
      history JSONB DEFAULT '[]',
      intent_detected TEXT,
      entities_mentioned JSONB DEFAULT '[]',
      context_summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
    );
  `,

  conversationContextIndex: `
    CREATE INDEX IF NOT EXISTS idx_conversation_context_session
    ON conversation_context (session_id, created_at DESC);
  `,

  conversationContextExpiryIndex: `
    CREATE INDEX IF NOT EXISTS idx_conversation_context_expiry
    ON conversation_context (expires_at);
  `,

  // Calendar events (synced from Google Calendar)
  calendarEvents: `
    CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_event_id TEXT UNIQUE NOT NULL,
      calendar_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      location TEXT,
      attendees JSONB DEFAULT '[]',
      is_all_day BOOLEAN DEFAULT FALSE,
      recurrence_rule TEXT,
      status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
      event_type TEXT CHECK (event_type IN ('meeting', 'focus', 'travel', 'personal', 'other')),
      ghl_contact_ids TEXT[],
      metadata JSONB DEFAULT '{}',
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,

  calendarEventsIndex: `
    CREATE INDEX IF NOT EXISTS idx_calendar_events_time
    ON calendar_events (start_time, end_time);
  `,

  // Sync state for incremental syncs
  syncState: `
    CREATE TABLE IF NOT EXISTS sync_state (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL CHECK (service IN ('gmail', 'calendar', 'ghl', 'notion', 'github')),
      last_sync_token TEXT,
      last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_page_token TEXT,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,

  // Updated at trigger function
  updateTimestampFunction: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `,
};

// Tables that need updated_at triggers
const TABLES_WITH_TRIGGERS = [
  'knowledge_chunks',
  'entity_relationships',
  'conversation_context',
  'calendar_events',
  'sync_state',
];

async function executeSql(sql, description) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql }).single();
    if (error) {
      console.log(`⚠️  ${description}: May need manual execution`);
      return false;
    }
    console.log(`✅ ${description}`);
    return true;
  } catch (err) {
    console.log(`⚠️  ${description}: ${err.message}`);
    return false;
  }
}

async function testTableAccess(tableName) {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(1);
    if (error && error.code === '42P01') {
      return false; // Table doesn't exist
    }
    return true;
  } catch {
    return false;
  }
}

async function setupSchema() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗄️  ACT Knowledge Hub - Supabase Schema Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  // Check if tables already exist
  console.log('🔍 Checking existing tables...');
  const existingTables = {};
  for (const table of ['knowledge_chunks', 'entity_relationships', 'contact_communications', 'conversation_context', 'calendar_events', 'sync_state']) {
    existingTables[table] = await testTableAccess(table);
    console.log(`   ${existingTables[table] ? '✅' : '⬜'} ${table}`);
  }
  console.log('');

  // Collect all SQL for manual execution if needed
  const allSql = [];

  console.log('📦 Creating schema...\n');

  // Enable pgvector
  allSql.push({ sql: SCHEMA_SQL.enableVector, desc: 'Enable pgvector extension' });
  await executeSql(SCHEMA_SQL.enableVector, 'Enable pgvector extension');

  // Create knowledge_chunks
  if (!existingTables['knowledge_chunks']) {
    allSql.push({ sql: SCHEMA_SQL.knowledgeChunks, desc: 'Create knowledge_chunks table' });
    await executeSql(SCHEMA_SQL.knowledgeChunks, 'Create knowledge_chunks table');
    allSql.push({ sql: SCHEMA_SQL.knowledgeChunksIndex, desc: 'Create knowledge_chunks vector index' });
    await executeSql(SCHEMA_SQL.knowledgeChunksIndex, 'Create knowledge_chunks vector index');
    allSql.push({ sql: SCHEMA_SQL.knowledgeChunksSourceIndex, desc: 'Create knowledge_chunks source index' });
    await executeSql(SCHEMA_SQL.knowledgeChunksSourceIndex, 'Create knowledge_chunks source index');
  } else {
    console.log('⏭️  knowledge_chunks already exists');
  }

  // Create entity_relationships
  if (!existingTables['entity_relationships']) {
    allSql.push({ sql: SCHEMA_SQL.entityRelationships, desc: 'Create entity_relationships table' });
    await executeSql(SCHEMA_SQL.entityRelationships, 'Create entity_relationships table');
    allSql.push({ sql: SCHEMA_SQL.entityRelationshipsIndex, desc: 'Create entity_relationships index' });
    await executeSql(SCHEMA_SQL.entityRelationshipsIndex, 'Create entity_relationships index');
  } else {
    console.log('⏭️  entity_relationships already exists');
  }

  // Create contact_communications
  if (!existingTables['contact_communications']) {
    allSql.push({ sql: SCHEMA_SQL.contactCommunications, desc: 'Create contact_communications table' });
    await executeSql(SCHEMA_SQL.contactCommunications, 'Create contact_communications table');
    allSql.push({ sql: SCHEMA_SQL.contactCommunicationsIndex, desc: 'Create contact_communications contact index' });
    await executeSql(SCHEMA_SQL.contactCommunicationsIndex, 'Create contact_communications contact index');
    allSql.push({ sql: SCHEMA_SQL.contactCommunicationsDateIndex, desc: 'Create contact_communications date index' });
    await executeSql(SCHEMA_SQL.contactCommunicationsDateIndex, 'Create contact_communications date index');
  } else {
    console.log('⏭️  contact_communications already exists');
  }

  // Create conversation_context
  if (!existingTables['conversation_context']) {
    allSql.push({ sql: SCHEMA_SQL.conversationContext, desc: 'Create conversation_context table' });
    await executeSql(SCHEMA_SQL.conversationContext, 'Create conversation_context table');
    allSql.push({ sql: SCHEMA_SQL.conversationContextIndex, desc: 'Create conversation_context session index' });
    await executeSql(SCHEMA_SQL.conversationContextIndex, 'Create conversation_context session index');
    allSql.push({ sql: SCHEMA_SQL.conversationContextExpiryIndex, desc: 'Create conversation_context expiry index' });
    await executeSql(SCHEMA_SQL.conversationContextExpiryIndex, 'Create conversation_context expiry index');
  } else {
    console.log('⏭️  conversation_context already exists');
  }

  // Create calendar_events
  if (!existingTables['calendar_events']) {
    allSql.push({ sql: SCHEMA_SQL.calendarEvents, desc: 'Create calendar_events table' });
    await executeSql(SCHEMA_SQL.calendarEvents, 'Create calendar_events table');
    allSql.push({ sql: SCHEMA_SQL.calendarEventsIndex, desc: 'Create calendar_events time index' });
    await executeSql(SCHEMA_SQL.calendarEventsIndex, 'Create calendar_events time index');
  } else {
    console.log('⏭️  calendar_events already exists');
  }

  // Create sync_state
  if (!existingTables['sync_state']) {
    allSql.push({ sql: SCHEMA_SQL.syncState, desc: 'Create sync_state table' });
    await executeSql(SCHEMA_SQL.syncState, 'Create sync_state table');
  } else {
    console.log('⏭️  sync_state already exists');
  }

  // Create trigger function
  console.log('');
  allSql.push({ sql: SCHEMA_SQL.updateTimestampFunction, desc: 'Create updated_at trigger function' });
  await executeSql(SCHEMA_SQL.updateTimestampFunction, 'Create updated_at trigger function');

  // Create triggers for each table
  for (const table of TABLES_WITH_TRIGGERS) {
    if (!existingTables[table]) {
      const triggerSql = `
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `;
      allSql.push({ sql: triggerSql, desc: `Create ${table} updated_at trigger` });
      await executeSql(triggerSql, `Create ${table} updated_at trigger`);
    }
  }

  // Output manual SQL if RPC failed
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 If any steps failed, run this SQL in Supabase SQL Editor:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  for (const { sql, desc } of allSql) {
    console.log(`-- ${desc}`);
    console.log(sql.trim());
    console.log('');
  }

  // Test inserts
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing table access...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Test knowledge_chunks
  try {
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .insert({
        content: 'Test knowledge chunk for ACT AI Operating System',
        source_type: 'manual',
        source_id: 'test-setup',
        project_id: 'act-global-infrastructure',
        metadata: { test: true }
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ knowledge_chunks: ${error.message}`);
    } else {
      console.log(`✅ knowledge_chunks: Insert successful (id: ${data.id})`);
      // Clean up
      await supabase.from('knowledge_chunks').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`❌ knowledge_chunks: ${err.message}`);
  }

  // Test entity_relationships
  try {
    const { data, error } = await supabase
      .from('entity_relationships')
      .insert({
        entity_type: 'project',
        entity_id: 'test-project',
        related_entity_type: 'contact',
        related_entity_id: 'test-contact',
        relationship_type: 'works_on'
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ entity_relationships: ${error.message}`);
    } else {
      console.log(`✅ entity_relationships: Insert successful (id: ${data.id})`);
      await supabase.from('entity_relationships').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`❌ entity_relationships: ${err.message}`);
  }

  // Test contact_communications
  try {
    const { data, error } = await supabase
      .from('contact_communications')
      .insert({
        ghl_contact_id: 'test-contact-123',
        comm_type: 'email',
        direction: 'inbound',
        summary: 'Test communication',
        occurred_at: new Date().toISOString(),
        source: 'manual'
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ contact_communications: ${error.message}`);
    } else {
      console.log(`✅ contact_communications: Insert successful (id: ${data.id})`);
      await supabase.from('contact_communications').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`❌ contact_communications: ${err.message}`);
  }

  // Test conversation_context
  try {
    const { data, error } = await supabase
      .from('conversation_context')
      .insert({
        session_id: 'test-session-' + Date.now(),
        interface: 'claude_code',
        site: 'act-farm',
        history: [{ role: 'user', content: 'Test message' }]
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ conversation_context: ${error.message}`);
    } else {
      console.log(`✅ conversation_context: Insert successful (id: ${data.id})`);
      await supabase.from('conversation_context').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`❌ conversation_context: ${err.message}`);
  }

  // Test calendar_events
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        google_event_id: 'test-event-' + Date.now(),
        calendar_id: 'primary',
        title: 'Test Calendar Event',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ calendar_events: ${error.message}`);
    } else {
      console.log(`✅ calendar_events: Insert successful (id: ${data.id})`);
      await supabase.from('calendar_events').delete().eq('id', data.id);
    }
  } catch (err) {
    console.log(`❌ calendar_events: ${err.message}`);
  }

  // Test sync_state
  try {
    const { data, error } = await supabase
      .from('sync_state')
      .upsert({
        id: 'test-sync-state',
        service: 'gmail',
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ sync_state: ${error.message}`);
    } else {
      console.log(`✅ sync_state: Upsert successful (id: ${data.id})`);
      await supabase.from('sync_state').delete().eq('id', 'test-sync-state');
    }
  } catch (err) {
    console.log(`❌ sync_state: ${err.message}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Schema setup complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Tables created:');
  console.log('   • knowledge_chunks - Vector-enabled content for RAG');
  console.log('   • entity_relationships - Contact/project relationship tracking');
  console.log('   • contact_communications - Email/call/meeting history');
  console.log('   • conversation_context - Chatbot session memory');
  console.log('   • calendar_events - Google Calendar sync');
  console.log('   • sync_state - Incremental sync tracking');
  console.log('');
  console.log('🔗 Next steps:');
  console.log('   1. Set up Google OAuth: node scripts/setup-google-auth.mjs');
  console.log('   2. Configure GHL webhooks: node scripts/setup-ghl-webhooks.mjs');
  console.log('   3. Start calendar sync: node scripts/calendar-sync.mjs');
  console.log('');
}

setupSchema().catch(console.error);
