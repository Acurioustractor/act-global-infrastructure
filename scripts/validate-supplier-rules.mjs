#!/usr/bin/env node
/**
 * Validate Supplier Rules
 *
 * Checks Xero transactions against configured Dext supplier rules
 * to identify missing configurations or mismatched settings.
 *
 * Usage:
 *   node scripts/validate-supplier-rules.mjs           # Full validation
 *   node scripts/validate-supplier-rules.mjs summary   # Quick summary
 *   node scripts/validate-supplier-rules.mjs missing   # Show only missing vendors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

// Load supplier rules
const rulesPath = join(__dirname, '../config/dext-supplier-rules.json');
const supplierRules = JSON.parse(readFileSync(rulesPath, 'utf8'));

// Build vendor lookup from rules
function buildVendorLookup() {
  const lookup = new Map();

  for (const category of Object.values(supplierRules.auto_publish_rules || {})) {
    for (const vendor of category.vendors || []) {
      // Add main name
      lookup.set(vendor.name.toLowerCase(), {
        ...vendor,
        category: category.description
      });

      // Add aliases
      for (const alias of vendor.aliases || []) {
        lookup.set(alias.toLowerCase(), {
          ...vendor,
          category: category.description
        });
      }
    }
  }

  // Add bank fees
  for (const vendor of supplierRules.bank_fees?.vendors || []) {
    lookup.set(vendor.name.toLowerCase(), {
      ...vendor,
      category: 'Bank fees'
    });
    for (const alias of vendor.aliases || []) {
      lookup.set(alias.toLowerCase(), vendor);
    }
  }

  return lookup;
}

// Find matching vendor in rules
function findVendorMatch(contactName, lookup) {
  const normalized = contactName.toLowerCase().trim();

  // Exact match
  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  // Partial match
  for (const [key, vendor] of lookup) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return vendor;
    }
  }

  return null;
}

async function validateSuppliers() {
  const command = process.argv[2] || 'full';
  const vendorLookup = buildVendorLookup();

  // Initialize Supabase inside function after dotenv loads
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\n🔍 Supplier Rules Validation');
  console.log('━'.repeat(60));

  // Get all unique vendors from Xero
  const { data: invoiceVendors } = await supabase
    .from('xero_invoices')
    .select('contact_name')
    .eq('type', 'ACCPAY')
    .not('contact_name', 'is', null);

  const { data: txnVendors } = await supabase
    .from('xero_transactions')
    .select('contact_name')
    .eq('type', 'SPEND')
    .not('contact_name', 'is', null);

  // Combine and dedupe
  const allVendors = new Map();

  for (const { contact_name } of invoiceVendors || []) {
    const key = contact_name.toLowerCase();
    allVendors.set(key, {
      name: contact_name,
      sources: ['invoice']
    });
  }

  for (const { contact_name } of txnVendors || []) {
    const key = contact_name.toLowerCase();
    if (allVendors.has(key)) {
      allVendors.get(key).sources.push('transaction');
    } else {
      allVendors.set(key, {
        name: contact_name,
        sources: ['transaction']
      });
    }
  }

  // Categorize vendors
  const configured = [];
  const missing = [];
  const autoPublish = [];
  const manualReview = [];

  for (const [key, vendor] of allVendors) {
    const rule = findVendorMatch(vendor.name, vendorLookup);

    if (rule) {
      configured.push({ vendor, rule });
      if (rule.auto_publish) {
        autoPublish.push({ vendor, rule });
      } else {
        manualReview.push({ vendor, rule });
      }
    } else {
      missing.push(vendor);
    }
  }

  // Output based on command
  if (command === 'summary' || command === 'full') {
    console.log('\n📊 Summary');
    console.log(`   Total unique vendors: ${allVendors.size}`);
    console.log(`   ✅ Configured: ${configured.length}`);
    console.log(`   ⚠️  Missing rules: ${missing.length}`);
    console.log(`   🤖 Auto-publish: ${autoPublish.length}`);
    console.log(`   👀 Manual review: ${manualReview.length}`);
  }

  if (command === 'missing' || command === 'full') {
    console.log('\n⚠️  Vendors Missing Rules');
    console.log('─'.repeat(60));

    if (missing.length === 0) {
      console.log('   All vendors have rules configured! 🎉');
    } else {
      for (const vendor of missing.slice(0, 20)) {
        const sources = vendor.sources.join(', ');
        console.log(`   • ${vendor.name} (${sources})`);
      }

      if (missing.length > 20) {
        console.log(`   ... and ${missing.length - 20} more`);
      }
    }
  }

  if (command === 'full') {
    console.log('\n🤖 Auto-Publish Vendors');
    console.log('─'.repeat(60));

    for (const { vendor, rule } of autoPublish) {
      const tracking = rule.tracking || 'Not set';
      console.log(`   ✅ ${vendor.name}`);
      console.log(`      Category: ${rule.category} | Tracking: ${tracking}`);
    }

    console.log('\n👀 Manual Review Vendors');
    console.log('─'.repeat(60));

    for (const { vendor, rule } of manualReview) {
      const note = rule.note || 'Review required';
      console.log(`   ⏸️  ${vendor.name}`);
      console.log(`      ${note}`);
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📋 Setup Instructions: config/dext-supplier-rules.json');
  console.log('📖 Documentation: docs/FINANCE_AUTOMATION_SYSTEM.md\n');

  return {
    total: allVendors.size,
    configured: configured.length,
    missing: missing.length,
    autoPublish: autoPublish.length,
    manualReview: manualReview.length
  };
}

validateSuppliers().catch(console.error);
