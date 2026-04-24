#!/usr/bin/env node
/**
 * Generate per-project financial fact sheets (PRIVATE).
 *
 * For each active project code, writes a markdown fact sheet to
 * thoughts/shared/financials/<code>.md covering:
 *   - Spend (YTD + by quarter)
 *   - Revenue (ACCREC invoices + ACCREC receipts)
 *   - Top vendors
 *   - R&D eligible spend
 *   - Self-reliance ratio (revenue / spend)
 *
 * Output is PRIVATE — thoughts/ is never walked by the wiki build.
 * The command-center can read these for internal dashboards.
 *
 * Usage:
 *   node scripts/generate-project-financials.mjs           # All projects with activity
 *   node scripts/generate-project-financials.mjs ACT-HV    # Single project
 *   node scripts/generate-project-financials.mjs --limit 10
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OUT_DIR = join(process.cwd(), 'thoughts', 'shared', 'financials');
mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
const onlyCode = args.find((a) => a.startsWith('ACT-'))?.toUpperCase();

const PROJECT_NAMES = {
  'ACT-10': '10x10 Retreat', 'ACT-BB': 'Barkly Backbone', 'ACT-BG': 'BG Fit',
  'ACT-BM': 'Bimberi', 'ACT-BR': 'ACT Bali Retreat', 'ACT-BV': 'Black Cockatoo Valley',
  'ACT-CA': 'Caring for those who care', 'ACT-CB': 'Marriage Celebrant',
  'ACT-CF': 'The Confessional', 'ACT-CN': 'Contained', 'ACT-DG': 'Diagrama',
  'ACT-DL': 'DadLab', 'ACT-DO': 'Designing for Obsolescence', 'ACT-EL': 'Empathy Ledger',
  'ACT-ER': 'PICC Elders Room', 'ACT-FA': 'Festival Activations',
  'ACT-FG': 'Feel Good Project', 'ACT-FM': 'The Farm', 'ACT-FO': 'Fishers Oysters',
  'ACT-FP': 'Fairfax PLACE Tech', 'ACT-GD': 'Goods', 'ACT-GL': 'Global Laundry Alliance',
  'ACT-GP': 'Gold Phone', 'ACT-HS': 'Project Her-Self', 'ACT-HV': 'The Harvest Witta',
  'ACT-IN': 'ACT Infrastructure', 'ACT-JH': 'JusticeHub', 'ACT-JP': "June's Patch",
  'ACT-MC': 'Cars and Microcontrollers', 'ACT-MD': 'ACT Monthly Dinners',
  'ACT-MM': 'MMEIC Justice', 'ACT-MR': 'MingaMinga Rangers', 'ACT-MY': 'Mounty Yarns',
  'ACT-OO': 'Oonchiumpa', 'ACT-PI': 'PICC', 'ACT-PS': 'PICC Photo Studio',
  'ACT-RA': 'Regional Arts Fellowship', 'ACT-SM': 'SMART', 'ACT-SS': 'Storm Stories',
  'ACT-TN': 'TOMNET', 'ACT-TR': 'Treacher', 'ACT-TW': "Travelling Women's Car",
  'ACT-UA': 'Uncle Allan Palm Island Art', 'ACT-WE': 'Westpac Summit 2025',
};

// Tracking-option variants used in Xero (legacy + current names) per project code
const PROJECT_TRACKING_VARIANTS = {
  'ACT-GD': ['ACT-GD — Goods', 'Goods.', 'Goods'],
  'ACT-HV': ['ACT-HV — The Harvest Witta', 'The Harvest'],
  'ACT-BG': ['ACT-BG — BG Fit', 'BG Fit'],
  'ACT-JH': ['ACT-JH — JusticeHub', 'JusticeHub'],
  'ACT-EL': ['ACT-EL — Empathy Ledger', 'Empathy Ledger'],
  'ACT-JP': ["ACT-JP — June's Patch", "June's Patch"],
  'ACT-MY': ['ACT-MY — Mounty Yarns', 'Mounty'],
  'ACT-PI': ['ACT-PI — PICC', 'PICC Centre'],
  'ACT-PS': ['ACT-PS — PICC Photo Studio', 'PICC Photo Studio'],
  'ACT-ER': ['ACT-ER — PICC Elders Room'],
  'ACT-IN': ['ACT-IN — ACT Infrastructure', 'ACT-IN — Infrastructure'],
  'ACT-FM': ['ACT-FM — The Farm'],
  'ACT-OO': ['ACT-OO — Oonchiumpa'],
};
function variantsFor(code) {
  return PROJECT_TRACKING_VARIANTS[code] || [`${code} — ${PROJECT_NAMES[code] || code}`];
}
// PICC family = PICC (ACT-PI) + Elders Room (ACT-ER) + Photo Studio (ACT-PS)
// If requested as ACT-PI, roll up all PICC children
function expandedCodes(code) {
  if (code === 'ACT-PI') return ['ACT-PI', 'ACT-ER', 'ACT-PS'];
  return [code];
}

// Contact name → project code attribution (used as FALLBACK when invoice has no Project Tracking)
// Also classifies income as 'grant' (philanthropic) vs 'earned' (commercial/services)
const CONTACT_PROJECT_MAP = {
  // Client orgs — earned revenue
  'Palm Island Community Company Limited (PICC)': { code: 'ACT-PI', kind: 'earned' },
  'Palm Island Community Company': { code: 'ACT-PI', kind: 'earned' },
  'GREEN FOX TRAINING STUDIO LIMITED': { code: 'ACT-BG', kind: 'earned' },
  'Brodie Germaine Fitness Aboriginal Corporation': { code: 'ACT-BG', kind: 'earned' },
  'Ingkerreke Services Aboriginal Corporation': { code: 'ACT-GD', kind: 'earned' },
  'Julalikari Council Aboriginal Corporation': { code: 'ACT-OO', kind: 'earned' },
  'Red Dust Role Models Limited': { code: 'ACT-GD', kind: 'earned' },
  'SMART Recovery Australia': { code: 'ACT-SM', kind: 'earned' },
  'Our Community Shed Incorporated': { code: 'ACT-FM', kind: 'earned' },
  'Sonas Properties Pty Ltd': { code: 'ACT-HV', kind: 'earned' },
  'Just Reinvest': { code: 'ACT-MY', kind: 'earned' }, // Mounty Yarns (per Ben 2026-04-23)
  'Berry Obsession PTY LTD': { code: 'ACT-HV', kind: 'earned' },
  'Blue Gum Station': { code: 'ACT-FM', kind: 'earned' },

  // Grantors / Foundations — grant income
  'The Snow Foundation': { code: 'ACT-IN', kind: 'grant' },
  'Centrecorp Foundation': { code: 'ACT-GD', kind: 'grant' },
  'Vincent Fairfax Family Foundation': { code: 'ACT-FP', kind: 'grant' },
  'Regional Arts Australia': { code: 'ACT-RA', kind: 'grant' },
  'Social Impact Hub Foundation': { code: 'ACT-IN', kind: 'grant' },
  'Dusseldorp Forum': { code: 'ACT-IN', kind: 'grant' },
  'Brisbane Powerhouse Foundation': { code: 'ACT-IN', kind: 'grant' },

  // Recurring / misc
  'Aleisha J Keating': { code: 'ACT-IN', kind: 'earned' }, // 27 invoices — likely personal client
};
function matchContact(name) {
  if (!name) return null;
  if (CONTACT_PROJECT_MAP[name]) return CONTACT_PROJECT_MAP[name];
  const lc = name.toLowerCase();
  for (const [k, v] of Object.entries(CONTACT_PROJECT_MAP)) {
    if (lc.includes(k.toLowerCase()) || k.toLowerCase().includes(lc)) return v;
  }
  return null;
}

const QUARTERS = [
  { key: 'Q4 FY26', start: '2026-04-01', end: '2026-06-30' },
  { key: 'Q3 FY26', start: '2026-01-01', end: '2026-03-31' },
  { key: 'Q2 FY26', start: '2025-10-01', end: '2025-12-31' },
  { key: 'Q1 FY26', start: '2025-07-01', end: '2025-09-30' },
];

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function pct(n, d) {
  if (!d) return '—';
  return (n / d * 100).toFixed(1) + '%';
}

async function q(sql, params = {}) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function getActiveProjects() {
  if (onlyCode) return [{ project_code: onlyCode }];
  // Union: projects appearing in card spend OR in Xero tracking categories (revenue or bills)
  const codes = new Set();
  const cardSpend = await q(`
    SELECT project_code
    FROM bank_statement_lines
    WHERE direction = 'debit' AND project_code LIKE 'ACT-%'
    GROUP BY project_code
  `);
  cardSpend.forEach((r) => codes.add(r.project_code));
  // Tracking-tagged invoices (ACCPAY + ACCREC)
  for (const [projectCode, variants] of Object.entries(PROJECT_TRACKING_VARIANTS)) {
    for (const variant of variants) {
      const rows = await q(`
        SELECT 1 FROM xero_invoices
        WHERE status NOT IN ('VOIDED','DELETED')
          AND date >= '2025-07-01'
          AND line_items::text ILIKE '%${variant.replace(/'/g, "''")}%'
        LIMIT 1
      `);
      if (rows.length > 0) { codes.add(projectCode); break; }
    }
  }
  // Also include any project code that appears as a contact-map target
  for (const v of Object.values(CONTACT_PROJECT_MAP)) codes.add(v.code);
  const out = [...codes].map((c) => ({ project_code: c }));
  return LIMIT ? out.slice(0, LIMIT) : out;
}

async function buildProject(code) {
  const name = PROJECT_NAMES[code] || code;
  const rollupCodes = expandedCodes(code);
  const variants = rollupCodes.flatMap(variantsFor);
  const codeSet = "('" + rollupCodes.join("','") + "')";
  // SQL ILIKE pattern that matches any tracking variant
  const variantClauses = variants.map((v) => `line_items::text ILIKE '%${v.replace(/'/g, "''")}%'`).join(' OR ');

  // Per-quarter spend from bank_statement_lines (card 1656)
  const spendByQ = await q(`
    SELECT
      CASE
        WHEN date >= '2026-04-01' AND date <= '2026-06-30' THEN 'Q4 FY26'
        WHEN date >= '2026-01-01' AND date <= '2026-03-31' THEN 'Q3 FY26'
        WHEN date >= '2025-10-01' AND date <= '2025-12-31' THEN 'Q2 FY26'
        WHEN date >= '2025-07-01' AND date <= '2025-09-30' THEN 'Q1 FY26'
        ELSE 'Other'
      END AS quarter,
      COUNT(*)::int AS lines,
      ROUND(SUM(ABS(amount))::numeric, 0) AS spend,
      ROUND(SUM(CASE WHEN rd_eligible THEN ABS(amount) ELSE 0 END)::numeric, 0) AS rd_spend
    FROM bank_statement_lines
    WHERE direction = 'debit' AND project_code IN ${codeSet}
    GROUP BY quarter
  `);
  const spendMap = new Map(spendByQ.map((r) => [r.quarter, r]));

  // ACCPAY bills (payments to suppliers, from any account) tagged by project tracking
  const billSpend = await q(`
    SELECT COUNT(*)::int AS n, ROUND(SUM(total)::numeric, 0) AS total
    FROM xero_invoices
    WHERE type = 'ACCPAY' AND status IN ('AUTHORISED','PAID')
      AND date >= '2025-07-01'
      AND (${variantClauses})
  `);
  const totalBillSpend = Number(billSpend[0]?.total || 0);

  const totalCardSpend = spendByQ.reduce((s, r) => s + Number(r.spend || 0), 0);
  const totalSpend = totalCardSpend + totalBillSpend; // union; may double-count for card-paid ACCPAY
  const totalRD = spendByQ.reduce((s, r) => s + Number(r.rd_spend || 0), 0);

  // Top vendors YTD — from card lines
  const topVendors = await q(`
    SELECT payee, COUNT(*)::int AS n, ROUND(SUM(ABS(amount))::numeric, 0) AS total
    FROM bank_statement_lines
    WHERE direction = 'debit' AND project_code IN ${codeSet}
      AND date >= '2025-07-01'
    GROUP BY payee
    ORDER BY total DESC NULLS LAST
    LIMIT 10
  `);

  // Revenue from ACCREC invoices — tracking variant match OR fallback contact match
  const contactsForThisCode = Object.entries(CONTACT_PROJECT_MAP)
    .filter(([, v]) => rollupCodes.includes(v.code))
    .map(([name]) => name);
  const contactClauses = contactsForThisCode.length > 0
    ? contactsForThisCode.map((c) => `contact_name ILIKE '${c.replace(/'/g, "''")}'`).join(' OR ')
    : 'FALSE';
  const revenueInvoices = await q(`
    SELECT COUNT(*)::int AS n, ROUND(SUM(total)::numeric, 0) AS total
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status IN ('AUTHORISED','PAID')
      AND date >= '2025-07-01'
      AND ((${variantClauses}) OR (${contactClauses}))
  `);

  // Split earned vs grant via contact kind
  const grantContacts = Object.entries(CONTACT_PROJECT_MAP)
    .filter(([, v]) => rollupCodes.includes(v.code) && v.kind === 'grant')
    .map(([name]) => name);
  const grantClauses = grantContacts.length > 0
    ? grantContacts.map((c) => `contact_name ILIKE '${c.replace(/'/g, "''")}'`).join(' OR ')
    : 'FALSE';
  const grantRev = grantContacts.length > 0 ? await q(`
    SELECT ROUND(SUM(total)::numeric, 0) AS total
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status IN ('AUTHORISED','PAID')
      AND date >= '2025-07-01'
      AND (${grantClauses})
  `) : [{ total: 0 }];
  const totalGrant = Number(grantRev[0]?.total || 0);

  // Revenue from direct RECEIVE bank transactions tagged to this project
  const revenueReceive = await q(`
    SELECT COUNT(*)::int AS n, ROUND(SUM(total)::numeric, 0) AS total
    FROM xero_transactions
    WHERE type = 'RECEIVE' AND date >= '2025-07-01'
      AND project_code IN ${codeSet}
  `);

  // Top revenue contacts (ACCREC) — via tracking OR contact fallback
  const topPayers = await q(`
    SELECT contact_name, COUNT(*)::int AS n, ROUND(SUM(total)::numeric, 0) AS total
    FROM xero_invoices
    WHERE type = 'ACCREC' AND status IN ('AUTHORISED','PAID')
      AND date >= '2025-07-01'
      AND ((${variantClauses}) OR (${contactClauses}))
    GROUP BY contact_name
    ORDER BY total DESC NULLS LAST
    LIMIT 10
  `);

  const invRev = Number(revenueInvoices[0]?.total || 0);
  const recRev = Number(revenueReceive[0]?.total || 0);
  const totalRevenue = invRev + recRev;
  const invoiceCount = Number(revenueInvoices[0]?.n || 0);
  const receiveCount = Number(revenueReceive[0]?.n || 0);

  // Self-reliance
  const selfReliance = totalSpend > 0 ? (totalRevenue / totalSpend) : null;
  const runwayDesc = totalRevenue === 0 ? 'No earned revenue this FY — fully dependent on other funding/absorption'
    : selfReliance >= 1 ? 'Self-reliant — revenue exceeds direct spend'
    : selfReliance >= 0.5 ? `Partial — covers ${pct(totalRevenue, totalSpend)} of own costs`
    : `Early — covers ${pct(totalRevenue, totalSpend)} of own costs`;

  // Build markdown
  const now = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push(`title: ${code} — ${name} Financials`);
  lines.push(`project_code: ${code}`);
  lines.push(`private: true`);
  lines.push(`do_not_publish: true`);
  lines.push(`generated_at: ${now}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${code} — ${name}`);
  lines.push('');
  lines.push(`> 🔒 **PRIVATE — Internal only.** Do not publish to wiki.act.place or any external surface.`);
  lines.push(`> Auto-generated by \`scripts/generate-project-financials.mjs\`. Last: ${now}.`);
  lines.push('');
  lines.push('## Summary (FY26 YTD)');
  lines.push('');
  lines.push(`- **Total spend**: ${fmt(totalSpend)}`);
  lines.push(`  - Card/bank lines: ${fmt(totalCardSpend)}`);
  lines.push(`  - ACCPAY bills (tracked): ${fmt(totalBillSpend)}`);
  lines.push(`  - R&D eligible (card): ${fmt(totalRD)} (${pct(totalRD, totalCardSpend)} of card spend)`);
  lines.push(`- **Total revenue**: ${fmt(totalRevenue)}`);
  lines.push(`  - ACCREC invoices: ${fmt(invRev)} across ${invoiceCount}`);
  lines.push(`    - Grants: ${fmt(totalGrant)} (${pct(totalGrant, invRev)})`);
  lines.push(`    - Earned: ${fmt(invRev - totalGrant)} (${pct(invRev - totalGrant, invRev)})`);
  lines.push(`  - Direct bank receipts: ${fmt(recRev)} across ${receiveCount}`);
  lines.push(`- **Net**: ${fmt(totalRevenue - totalSpend)}`);
  lines.push(`- **Self-reliance ratio**: ${selfReliance === null ? '—' : pct(totalRevenue, totalSpend)} (revenue / spend)`);
  lines.push(`- **Status**: ${runwayDesc}`);
  if (rollupCodes.length > 1) lines.push(`- **Rolled up**: ${rollupCodes.join(', ')}`);
  lines.push(`- **Name variants matched**: ${variants.join(', ')}`);
  lines.push('');
  lines.push('## Quarterly spend breakdown');
  lines.push('');
  lines.push('| Quarter | Lines | Spend | R&D eligible |');
  lines.push('|---|---|---|---|');
  for (const q of QUARTERS) {
    const row = spendMap.get(q.key) || { lines: 0, spend: 0, rd_spend: 0 };
    lines.push(`| ${q.key} | ${row.lines} | ${fmt(row.spend)} | ${fmt(row.rd_spend)} |`);
  }
  lines.push('');
  lines.push('## Top vendors YTD (card spend)');
  lines.push('');
  if (topVendors.length === 0) {
    lines.push('_No tagged card spending yet._');
  } else {
    lines.push('| Vendor | # | Total |');
    lines.push('|---|---|---|');
    for (const v of topVendors) {
      lines.push(`| ${(v.payee || '—').replace(/\|/g, '\\|').slice(0, 60)} | ${v.n} | ${fmt(v.total)} |`);
    }
  }
  lines.push('');
  lines.push('## Top payers YTD (revenue contacts)');
  lines.push('');
  if (topPayers.length === 0) {
    lines.push('_No tagged revenue yet._');
  } else {
    lines.push('| Contact | # | Total |');
    lines.push('|---|---|---|');
    for (const p of topPayers) {
      lines.push(`| ${(p.contact_name || '—').replace(/\|/g, '\\|').slice(0, 60)} | ${p.n} | ${fmt(p.total)} |`);
    }
  }
  lines.push('');
  lines.push('## Self-reliance question');
  lines.push('');
  if (totalRevenue === 0 && totalSpend > 0) {
    lines.push(`To reach break-even, ${code} needs **${fmt(totalSpend / 4)} per quarter** in earned revenue at current spend rate.`);
    lines.push('');
    lines.push('**Revenue potential signals:**');
    lines.push('- [ ] List current / potential revenue channels');
    lines.push('- [ ] Estimate realistic earning capacity per channel');
    lines.push('- [ ] Identify single biggest lever to move self-reliance ratio');
  } else if (totalRevenue > 0 && totalRevenue < totalSpend) {
    lines.push(`Gap to break-even: **${fmt(totalSpend - totalRevenue)} YTD** (${pct(totalSpend - totalRevenue, totalSpend)} of spend).`);
  } else if (totalRevenue >= totalSpend && totalSpend > 0) {
    lines.push(`✅ Self-sustaining YTD. Surplus: **${fmt(totalRevenue - totalSpend)}**.`);
  }
  lines.push('');
  lines.push('## Data sources');
  lines.push('');
  lines.push('- Spend: `bank_statement_lines` where `project_code = ' + code + '`');
  lines.push('- Revenue: `xero_invoices` ACCREC where `line_items` contains `' + code + '` in tracking');
  lines.push('- R&D flag: `bank_statement_lines.rd_eligible`');
  lines.push('- Period: FY26 YTD (2025-07-01 to today)');

  const outPath = join(OUT_DIR, `${code}.md`);
  writeFileSync(outPath, lines.join('\n') + '\n');
  return { code, name, totalSpend, totalRevenue, totalGrant, earnedRev: invRev - totalGrant, path: outPath };
}

async function main() {
  const projects = await getActiveProjects();
  console.log(`Generating financial fact sheets for ${projects.length} project(s)...\n`);

  const results = [];
  for (const p of projects) {
    try {
      const r = await buildProject(p.project_code);
      console.log(`✓ ${r.code.padEnd(8)} ${(r.name || '').padEnd(30)} spend ${fmt(r.totalSpend).padStart(12)}  rev ${fmt(r.totalRevenue).padStart(12)}`);
      results.push(r);
    } catch (e) {
      console.log(`✗ ${p.project_code} — ${e.message}`);
    }
  }

  // Write an index
  const indexLines = ['---', 'title: Project Financials Index', 'private: true', 'do_not_publish: true', `generated_at: ${new Date().toISOString().slice(0, 10)}`, '---', '',
    '# Project Financials — index',
    '',
    '> 🔒 **PRIVATE** — never publish.',
    '',
    '| Code | Project | Spend | Grants | Earned | Net | Self-reliance | Earned-only |',
    '|---|---|---|---|---|---|---|---|',
  ];
  // Hide codes that roll up to another (e.g. ACT-ER/ACT-PS roll up to ACT-PI)
  const rolledUp = new Set(['ACT-ER', 'ACT-PS']);
  for (const r of results.sort((a, b) => b.totalSpend - a.totalSpend)) {
    if (rolledUp.has(r.code)) continue;
    const sr = r.totalSpend > 0 ? pct(r.totalRevenue, r.totalSpend) : '—';
    const earnedOnly = r.totalSpend > 0 ? pct(r.earnedRev, r.totalSpend) : '—';
    indexLines.push(`| [${r.code}](./${r.code}.md) | ${r.name} | ${fmt(r.totalSpend)} | ${fmt(r.totalGrant)} | ${fmt(r.earnedRev)} | ${fmt(r.totalRevenue - r.totalSpend)} | ${sr} | ${earnedOnly} |`);
  }
  indexLines.push('');
  indexLines.push('_ACT-ER (PICC Elders Room) and ACT-PS (PICC Photo Studio) roll up to ACT-PI in the summary above. Individual sheets still generated._');
  writeFileSync(join(OUT_DIR, 'INDEX.md'), indexLines.join('\n') + '\n');

  console.log(`\n✓ Wrote ${results.length} fact sheets + INDEX to thoughts/shared/financials/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
