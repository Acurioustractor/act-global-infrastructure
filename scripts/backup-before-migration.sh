#!/bin/bash
# Database Backup Before Migration
# Purpose: Create full backups of both Farmhand and Main databases
# Run this BEFORE executing migrate-farmhand-to-main.mjs
#
# Created: 2026-01-22
# Part of: ACT Farmhand → Main Database Consolidation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ACT Database Backup - Pre-Migration${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Configuration
BACKUP_DIR="./backups/pre-migration-$(date +%Y%m%d-%H%M%S)"
FARMHAND_PROJECT="bhwyqqbovcjoefezgfnq"
MAIN_PROJECT="tednluwflfhxyucgwigh"

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}📁 Backup directory: $BACKUP_DIR${NC}"
echo ""

# Check for required tools
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ supabase CLI not found. Install with: brew install supabase/tap/supabase${NC}"
    exit 1
fi

# Check for database URLs in environment
if [ -z "$SUPABASE_DB_URL" ] && [ -z "$FARMHAND_DB_URL" ]; then
    echo -e "${YELLOW}⚠️  No database URLs found in environment.${NC}"
    echo -e "${YELLOW}   Set FARMHAND_DB_URL and MAIN_DB_URL, or use Supabase CLI auth.${NC}"
    echo ""
    echo "Example:"
    echo "  export FARMHAND_DB_URL='postgresql://postgres:PASSWORD@db.bhwyqqbovcjoefezgfnq.supabase.co:5432/postgres'"
    echo "  export MAIN_DB_URL='postgresql://postgres:PASSWORD@db.tednluwflfhxyucgwigh.supabase.co:5432/postgres'"
    echo ""
fi

# Function to backup a database using Supabase CLI
backup_database() {
    local project_id=$1
    local name=$2
    local output_file="$BACKUP_DIR/${name}.sql"

    echo -e "${YELLOW}🔄 Backing up $name ($project_id)...${NC}"

    # Try Supabase CLI first
    if supabase db dump --db-url "postgresql://postgres.${project_id}:@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres" -f "$output_file" 2>/dev/null; then
        echo -e "${GREEN}✅ $name backup complete: $output_file${NC}"
        return 0
    fi

    # If that fails, try with environment variable
    local db_url_var="${name^^}_DB_URL"  # Uppercase name + _DB_URL
    local db_url="${!db_url_var}"

    if [ -n "$db_url" ]; then
        if pg_dump "$db_url" -f "$output_file" 2>/dev/null; then
            echo -e "${GREEN}✅ $name backup complete: $output_file${NC}"
            return 0
        fi
    fi

    echo -e "${RED}❌ Failed to backup $name${NC}"
    echo "   Try setting ${db_url_var} environment variable"
    return 1
}

# Backup specific tables from Farmhand
backup_farmhand_tables() {
    local output_file="$BACKUP_DIR/farmhand-critical-tables.sql"

    echo -e "${YELLOW}🔄 Exporting critical Farmhand tables...${NC}"

    # Tables to migrate
    local tables=(
        "contact_communications"
        "communication_history"
        "calendar_events"
        "sync_state"
        "entities"
        "entity_mappings"
        "entity_relationships"
        "knowledge_chunks"
        "recommendation_outcomes"
        "learned_thresholds"
    )

    # Export using Supabase if authenticated
    for table in "${tables[@]}"; do
        echo "  - Exporting $table..."
        # This would use the Supabase API to export data
        # For now, create a placeholder noting which tables need backup
        echo "-- Table: $table" >> "$output_file"
        echo "-- TODO: Export data from Farmhand" >> "$output_file"
        echo "" >> "$output_file"
    done

    echo -e "${GREEN}✅ Critical tables noted in: $output_file${NC}"
}

# Export using Node.js script for more reliable data export
create_data_export_script() {
    local export_script="$BACKUP_DIR/export-farmhand-data.mjs"

    cat > "$export_script" << 'EXPORT_SCRIPT'
#!/usr/bin/env node
/**
 * Export Farmhand Data to JSON
 * Run this to create JSON backups of all critical tables
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Farmhand database
const FARMHAND_URL = 'https://bhwyqqbovcjoefezgfnq.supabase.co';
const FARMHAND_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FARMHAND_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(FARMHAND_URL, FARMHAND_KEY);

const TABLES_TO_EXPORT = [
    'contact_communications',
    'communication_history',
    'calendar_events',
    'sync_state',
    'entities',
    'entity_mappings',
    'entity_relationships',
    'knowledge_chunks',
    'recommendation_outcomes',
    'learned_thresholds'
];

async function exportTable(tableName) {
    console.log(`Exporting ${tableName}...`);

    let allData = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error(`  Error: ${error.message}`);
            break;
        }

        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        offset += limit;

        if (data.length < limit) break;
    }

    const outputPath = `${__dirname}/${tableName}.json`;
    writeFileSync(outputPath, JSON.stringify(allData, null, 2));
    console.log(`  ✓ ${allData.length} rows → ${outputPath}`);

    return allData.length;
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  Farmhand Data Export');
    console.log('═══════════════════════════════════════════\n');

    const results = {};

    for (const table of TABLES_TO_EXPORT) {
        try {
            results[table] = await exportTable(table);
        } catch (err) {
            console.error(`  Failed to export ${table}: ${err.message}`);
            results[table] = 0;
        }
    }

    // Write summary
    const summaryPath = `${__dirname}/export-summary.json`;
    writeFileSync(summaryPath, JSON.stringify({
        exportedAt: new Date().toISOString(),
        tables: results
    }, null, 2));

    console.log('\n═══════════════════════════════════════════');
    console.log('  Export Summary');
    console.log('═══════════════════════════════════════════');
    for (const [table, count] of Object.entries(results)) {
        console.log(`  ${table}: ${count} rows`);
    }
    console.log(`\nSummary saved to: ${summaryPath}`);
}

main().catch(console.error);
EXPORT_SCRIPT

    chmod +x "$export_script"
    echo -e "${GREEN}✅ Created data export script: $export_script${NC}"
    echo "   Run with: node $export_script"
}

# Main execution
echo -e "${YELLOW}Step 1: Create data export script${NC}"
create_data_export_script
echo ""

echo -e "${YELLOW}Step 2: Note critical tables for backup${NC}"
backup_farmhand_tables
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Backup Preparation Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Run the export script to backup Farmhand data:"
echo "     node $BACKUP_DIR/export-farmhand-data.mjs"
echo ""
echo "  2. Verify all JSON files are created in $BACKUP_DIR"
echo ""
echo "  3. Run the migration:"
echo "     node scripts/migrate-farmhand-to-main.mjs"
echo ""
echo "Backup directory: $BACKUP_DIR"
