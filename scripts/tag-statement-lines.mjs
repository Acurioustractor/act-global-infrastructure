#!/usr/bin/env node
/**
 * Tag bank statement lines with project codes.
 *
 * Resolution order:
 *   1. Skip manual overrides
 *   2. Vendor rules (vendor_project_rules table)
 *   3. Location rules (location_project_rules table — merchant suburb/city)
 *   4. Subscription patterns
 *   5. Travel trip rules (date range + vendor = project)
 *   6. Default: leave untagged
 *
 * Usage:
 *   node scripts/tag-statement-lines.mjs              # Dry run
 *   node scripts/tag-statement-lines.mjs --apply       # Write to DB
 *   node scripts/tag-statement-lines.mjs --untagged    # Only show unresolved
 *   node scripts/tag-statement-lines.mjs --quarter Q2  # Specific quarter
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const UNTAGGED_ONLY = process.argv.includes('--untagged');

// Travel trip rules — date range + vendor pattern = project
// These capture multi-day trips where Uber/Qantas/meals should be tagged to the trip's project
const TRIP_RULES = [
  // Oct trips
  { from: '2025-10-01', to: '2025-10-02', project: 'ACT-IN', notes: 'Sydney — general ACT work' },
  { from: '2025-10-03', to: '2025-10-06', project: 'ACT-FM', notes: 'Maleny / Sunshine Coast — Farm' },
  { from: '2025-10-07', to: '2025-10-12', project: 'ACT-GD', notes: 'Alice Springs — Goods on Country Oct' },
  { from: '2025-10-13', to: '2025-10-17', project: 'ACT-GD', notes: 'Top End — Goods on Country Oct' },
  { from: '2025-10-20', to: '2025-10-21', project: 'ACT-HV', notes: 'Townsville/Tully — Harvest' },
  { from: '2025-10-22', to: '2025-10-24', project: 'ACT-JH', notes: 'Sydney — JusticeHub / Mounty site visit Oct' },
  { from: '2025-10-27', to: '2025-10-31', project: 'ACT-IN', notes: 'Sydney/Melbourne — general ACT meetings' },
  // Nov trips
  { from: '2025-11-01', to: '2025-11-04', project: 'ACT-FM', notes: 'Maleny/Brisbane — Farm + travel' },
  { from: '2025-11-05', to: '2025-11-06', project: 'ACT-GD', notes: 'Alice Springs — Goods on Country Nov' },
  { from: '2025-11-10', to: '2025-11-14', project: 'ACT-GD', notes: 'Alice Springs / Mount Isa — Goods on Country Nov' },
  { from: '2025-11-17', to: '2025-11-20', project: 'ACT-IN', notes: 'Melbourne/Bali — international travel' },
  { from: '2025-11-21', to: '2025-11-26', project: 'ACT-IN', notes: 'Bali / Melbourne / return — international' },
  // Dec trips
  { from: '2025-12-01', to: '2025-12-07', project: 'ACT-HV', notes: 'Townsville — Harvest / PICC Dec build' },
  { from: '2025-12-08', to: '2025-12-13', project: 'ACT-MY', notes: 'Mt Druitt — Mounty Yarns build Dec' },
  { from: '2025-12-14', to: '2025-12-19', project: 'ACT-GD', notes: 'Alice Springs / Tennant Creek — Goods on Country Dec' },
  { from: '2025-12-22', to: '2025-12-25', project: 'ACT-IN', notes: 'VIC/SA road trip — general' },
  { from: '2025-12-29', to: '2025-12-31', project: 'ACT-FM', notes: 'Woodfordia / Maleny — Farm/home' },
];

// Vendor-specific overrides that are always the same project regardless of location
const VENDOR_PROJECT_OVERRIDES = {
  'Defy Design': 'ACT-GD',  // Goods project (per Ben 2026-04-29)
  'TradeMutt': 'ACT-HV',    // Hi-vis — Harvest
  'Hatch Electrical': 'ACT-PI', // Always PICC
  'RNM Carpentry': 'ACT-PI',   // Always PICC
  'Allclass': 'ACT-PI',        // Always PICC (Yandina trailer/equipment)
  'Carla Furnishers': 'ACT-GD', // Alice Springs furniture — Goods on Country
  'Container Options': 'ACT-MY', // Mounty container
  'The Sand Yard': 'ACT-MY',    // Mounty ground cover
  'Loadshift Sydney': 'ACT-MY', // Mounty container delivery
  'Bionic Storage': 'ACT-HV',   // Townsville storage
  'Telford Smith Engine': 'ACT-FM', // Farm equipment
  'Sydney Tools': 'ACT-HV',     // Townsville tools
  'Bargain Car Rentals': 'ACT-GD', // Tasmania trip for GD
  'Thriday': 'ACT-IN',          // Accounting software
  'Harvey Norman': 'ACT-HV',    // Townsville AV equipment
  'RedBalloon': 'ACT-IN',       // Team experience
  'NRMA Insurance': 'ACT-IN',   // Insurance
  'AIG Australia': 'ACT-IN',    // Insurance
  'ATO': 'ACT-IN',              // Tax payment
  'Dinkum Dunnies': 'ACT-HV',   // Portable toilet — Harvest
  'Brouhaha': 'ACT-FM',         // Maleny brewery — farm area
  'Google GSUITE': 'ACT-IN',    // Google Workspace
  'Kogan': 'ACT-IN',            // Online purchases
  'Flyparks': 'ACT-IN',         // Airport parking
  'GRAYZA': 'ACT-IN',           // Design tool
  'Indonesia Arrival': 'ACT-IN', // Bali visa
  'Scopri Olo Bar': 'ACT-IN',   // Melbourne dining
  'Brisbane Powerhouse': 'ACT-IN', // Events
  'TICKETS*FARM': 'ACT-FM',     // Farm event
  'Carla Furnishers': 'ACT-GD', // Alice Springs furniture
  'Epilogue Enterprises': 'ACT-GD', // Alice Springs
  'Bralinda Investments': 'ACT-GD', // Alice Springs accommodation
  'BOE Design': 'ACT-IN',       // Design work
  'Forestry Tools': 'ACT-FM',   // Farm tools
  'DNP Photo': 'ACT-IN',        // Photography
  'Sea Swift': 'ACT-GD',        // Palm Island freight
  'Officeworks': 'ACT-IN',      // Office supplies
};

async function main() {
  console.log('=== Tag Statement Lines ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN');

  // Load rules
  const { data: locationRules } = await sb.from('location_project_rules')
    .select('*').order('priority', { ascending: false });

  const { data: subscriptions } = await sb.from('subscription_patterns')
    .select('*').eq('active', true);

  // Load lines (paginate past Supabase 1000-row default)
  let allLines = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    let query = sb.from('bank_statement_lines')
      .select('*')
      .eq('direction', 'debit')
      .order('date')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (UNTAGGED_ONLY) {
      query = query.is('project_code', null);
    }

    const { data: batch } = await query;
    if (!batch || batch.length === 0) break;
    allLines.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  const lines = allLines;
  console.log(`Loaded: ${lines.length} lines, ${locationRules.length} location rules, ${subscriptions.length} subscriptions\n`);

  let tagged = 0;
  let skipped = 0;
  let alreadyTagged = 0;
  const updates = [];

  for (const line of lines) {
    // 1. Skip manual overrides
    if (line.project_source === 'manual') {
      alreadyTagged++;
      continue;
    }

    let code = null;
    let source = null;

    // 2. Vendor-specific override
    const payeeLower = (line.payee || '').toLowerCase();
    for (const [vendor, proj] of Object.entries(VENDOR_PROJECT_OVERRIDES)) {
      if (payeeLower.includes(vendor.toLowerCase())) {
        code = proj;
        source = 'vendor_override';
        break;
      }
    }

    // 3. Location rules (if no vendor override found)
    if (!code) {
      const partUpper = (line.particulars || '').toUpperCase();
      for (const rule of locationRules) {
        if (partUpper.includes(rule.location_pattern.toUpperCase())) {
          code = rule.project_code;
          source = 'location';
          break;
        }
      }
    }

    // 4. Subscription match
    if (!code) {
      const partUpper = (line.particulars || '').toUpperCase();
      for (const sub of subscriptions) {
        if (partUpper.includes(sub.vendor_pattern.toUpperCase()) || payeeLower.includes(sub.vendor_pattern.toLowerCase())) {
          code = sub.project_code;
          source = 'subscription';
          break;
        }
      }
    }

    // 5. Travel trip rules — date-based for Uber/Qantas/meals/transport
    if (!code) {
      const travelVendors = ['uber', 'qantas', 'virgin', 'cabcharge', 'taxipay', 'cabfare',
        'goget', 'airbnb', 'booking.com', 'hotel', 'novotel', 'vibe',
        'bp ', 'liberty', 'ampol', 'united ', 'eg group', 'budget rent', 'avis',
        'bargain car', 'linkt', 'flyparks', 'transport'];
      const isTravel = travelVendors.some(tv => payeeLower.includes(tv) || (line.particulars || '').toLowerCase().includes(tv));

      if (isTravel) {
        const lineDate = line.date;
        for (const trip of TRIP_RULES) {
          if (lineDate >= trip.from && lineDate <= trip.to) {
            code = trip.project;
            source = 'trip_rule';
            break;
          }
        }
      }
    }

    // 6. Meal/cafe vendors during trips
    if (!code) {
      const mealVendors = ['cafe', 'coffee', 'espresso', 'restaurant', 'bar ', 'bistro',
        'sushi', 'pizza', 'dominos', 'gelato', 'bakery', 'pie guy',
        'woolworths', 'coles', 'iga', 'aldi', 'nightowl', 'kmart', 'target'];
      const isMeal = mealVendors.some(mv => payeeLower.includes(mv) || (line.particulars || '').toLowerCase().includes(mv));

      if (isMeal) {
        const lineDate = line.date;
        for (const trip of TRIP_RULES) {
          if (lineDate >= trip.from && lineDate <= trip.to) {
            code = trip.project;
            source = 'trip_meal';
            break;
          }
        }
      }
    }

    if (code) {
      if (line.project_code === code) {
        alreadyTagged++;
        continue;
      }
      tagged++;
      updates.push({ id: line.id, project_code: code, project_source: source });

      if (!UNTAGGED_ONLY || !line.project_code) {
        console.log(`  ${line.date} | ${(line.payee || '?').padEnd(30)} | $${parseFloat(line.amount).toFixed(2).padStart(10)} | ${code.padEnd(8)} (${source})`);
      }
    } else {
      skipped++;
      if (UNTAGGED_ONLY && parseFloat(line.amount) > 50) {
        console.log(`  ${line.date} | ${(line.payee || '?').padEnd(30)} | $${parseFloat(line.amount).toFixed(2).padStart(10)} | ??? | ${(line.particulars || '').slice(0, 50)}`);
      }
    }
  }

  // Apply
  if (APPLY && updates.length > 0) {
    let applied = 0;
    for (const u of updates) {
      const { error } = await sb.from('bank_statement_lines').update({
        project_code: u.project_code,
        project_source: u.project_source,
      }).eq('id', u.id);
      if (!error) applied++;
    }
    console.log(`\n💾 Applied ${applied} tags`);
  }

  console.log(`\nSummary: ${tagged} tagged, ${alreadyTagged} already tagged, ${skipped} unresolved`);

  // Show project breakdown
  // Summary from direct query

  // Fallback summary
  const { data: summaryLines } = await sb.from('bank_statement_lines')
    .select('project_code, amount')
    .eq('direction', 'debit')
    .limit(5000);

  const byProj = {};
  for (const l of summaryLines || []) {
    const p = l.project_code || 'UNTAGGED';
    if (!byProj[p]) byProj[p] = { count: 0, total: 0 };
    byProj[p].count++;
    byProj[p].total += parseFloat(l.amount);
  }

  console.log('\nProject breakdown:');
  for (const [proj, data] of Object.entries(byProj).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${proj.padEnd(12)} ${String(data.count).padStart(4)} items  $${data.total.toFixed(2).padStart(12)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
