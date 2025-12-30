#!/usr/bin/env node

/**
 * Setup Sprint Snapshots Table in Supabase
 *
 * Creates the sprint_snapshots table for historical trend tracking.
 * Run this once to set up the schema.
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

async function setupTable() {
  console.log('🗄️  Setting up sprint_snapshots table...\n');

  // Create table using SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS sprint_snapshots (
      id BIGSERIAL PRIMARY KEY,
      sprint_name TEXT NOT NULL,
      snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_issues INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      in_progress INTEGER NOT NULL,
      todo INTEGER NOT NULL,
      blocked INTEGER NOT NULL,
      completion_percentage INTEGER NOT NULL,
      avg_cycle_time NUMERIC,
      avg_lead_time NUMERIC,
      throughput_per_week NUMERIC,
      flow_efficiency NUMERIC,
      wip_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: createTableSQL
  }).single();

  if (tableError) {
    console.log('⚠️  Table might already exist or needs manual creation');
    console.log('   Run this SQL in Supabase SQL Editor:\n');
    console.log(createTableSQL);
    console.log('');
  } else {
    console.log('✅ Table created successfully\n');
  }

  // Create index for faster queries
  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint_date
    ON sprint_snapshots(sprint_name, snapshot_date DESC);
  `;

  const { error: indexError } = await supabase.rpc('exec_sql', {
    sql: createIndexSQL
  }).single();

  if (indexError) {
    console.log('⚠️  Index creation - run manually if needed:\n');
    console.log(createIndexSQL);
    console.log('');
  } else {
    console.log('✅ Index created successfully\n');
  }

  // Test insert
  console.log('🧪 Testing table with sample data...\n');

  const { data, error: insertError } = await supabase
    .from('sprint_snapshots')
    .insert({
      sprint_name: 'Test Sprint',
      snapshot_date: new Date().toISOString(),
      total_issues: 10,
      completed: 5,
      in_progress: 3,
      todo: 2,
      blocked: 0,
      completion_percentage: 50,
      avg_cycle_time: 24.5,
      avg_lead_time: 48.0,
      throughput_per_week: 3.5,
      flow_efficiency: 45,
      wip_count: 3
    })
    .select();

  if (insertError) {
    console.error('❌ Test insert failed:', insertError.message);
    console.log('\n📋 Manual Setup Instructions:\n');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the following SQL:\n');
    console.log(createTableSQL);
    console.log(createIndexSQL);
  } else {
    console.log('✅ Test insert successful\n');
    console.log('   Sample data:', data[0]);

    // Clean up test data
    await supabase
      .from('sprint_snapshots')
      .delete()
      .eq('sprint_name', 'Test Sprint');

    console.log('   (Cleaned up test data)\n');
  }

  console.log('🎉 Setup complete!\n');
  console.log('💡 The dashboard will now track historical trends automatically.\n');
}

setupTable().catch(console.error);
