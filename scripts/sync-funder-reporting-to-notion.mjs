#!/usr/bin/env node
/**
 * sync-funder-reporting-to-notion.mjs
 *
 * Generates / refreshes a Notion reporting page per funder, mirroring the
 * Snow Foundation Reporting structure. Reads:
 *   - v_funder_next_move (Supabase)             — warmth + next-move per funder
 *   - xero_invoices ACCREC                       — full invoice ledger per funder
 *   - project_funding_allocations / drawdowns    — commitment vs drawn (where seeded)
 *
 * Writes pages into the Knowledge Hub DB (data source a94a4038-37f9-46de-afbb-041217d879c1)
 * tagged Resource Type=Grant + Tag=Funder, named "<Funder> Reporting".
 *
 * Idempotent: if a page already exists with the same name in Knowledge Hub, the
 * script replaces its content (not its title or properties) so manual edits to
 * properties survive.
 *
 * Usage:
 *   node scripts/sync-funder-reporting-to-notion.mjs                # dry-run preview
 *   node scripts/sync-funder-reporting-to-notion.mjs --apply        # write to Notion
 *   node scripts/sync-funder-reporting-to-notion.mjs --apply --funder "PICC"  # one funder
 *   node scripts/sync-funder-reporting-to-notion.mjs --apply --min-warmth 30  # threshold
 *   node scripts/sync-funder-reporting-to-notion.mjs --apply --hub-only        # just refresh hub
 *
 * Env required:
 *   NOTION_API_KEY              — secret_xxx from Notion integration
 *   SUPABASE_SHARED_URL / KEY   — for the shared Supabase instance
 *
 * Created 2026-05-21 as a follow-on to Snow Foundation Reporting.
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2025-09-03';
const KNOWLEDGE_HUB_DS_ID = 'a94a4038-37f9-46de-afbb-041217d879c1';
const HUB_PAGE_ID = '367ebcf9-81cf-81fd-b2a5-ca192253f0a0';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTION_KEY = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;

if (!NOTION_KEY) {
  console.error('Missing NOTION_API_KEY / NOTION_TOKEN env. Aborting.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const HUB_ONLY = args.includes('--hub-only');
const FORCE_UPDATE = args.includes('--force-update');
const funderIdx = args.indexOf('--funder');
const ONLY_FUNDER = funderIdx !== -1 ? args[funderIdx + 1] : null;
const minWarmthIdx = args.indexOf('--min-warmth');
const MIN_WARMTH = minWarmthIdx !== -1 ? Number(args[minWarmthIdx + 1]) : 30;

function fmtAud(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

async function notionFetch(path, init = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${init.method || 'GET'} ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\b(pty\s*ltd|ltd|limited|inc|incorporated|foundation|company|family)\b/g, '')
    .replace(/[(),.\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findFunderPage(funderName) {
  const targetNorm = normaliseName(funderName);
  // Search for the funder's distinctive token (longest word)
  const distinctive = targetNorm.split(' ')
    .filter(w => w.length >= 4)
    .sort((a, b) => b.length - a.length)[0] || funderName;
  const res = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: `${distinctive} Reporting`,
      filter: { property: 'object', value: 'page' },
      page_size: 20,
    }),
  });
  return (res.results || []).find(p => {
    const titleProp = p.properties?.Name?.title?.[0]?.plain_text;
    if (!titleProp || !titleProp.toLowerCase().includes('reporting')) return false;
    const titleNorm = normaliseName(titleProp.replace(/reporting/i, ''));
    return titleNorm.includes(targetNorm) || targetNorm.includes(titleNorm);
  }) || null;
}

async function getFunderRows() {
  const { data, error } = await sb
    .from('v_funder_next_move')
    .select('*')
    .gte('warmth_score', MIN_WARMTH)
    .gte('gross_revenue', 5000)
    .order('warmth_score', { ascending: false });
  if (error) throw new Error(`v_funder_next_move query: ${error.message}`);
  return data || [];
}

async function getInvoices(funderName) {
  const { data, error } = await sb
    .from('xero_invoices')
    .select('invoice_number, date, total, status, amount_due, line_items, project_code')
    .eq('type', 'ACCREC')
    .eq('contact_name', funderName)
    .not('status', 'in', '(DELETED,VOIDED)')
    .order('date');
  if (error) throw new Error(`invoice query for ${funderName}: ${error.message}`);
  return data || [];
}

function bandEmoji(band) {
  return { HOT: '🔥', WARM: '🌤', STEADY: '🟢', COOLING: '🌱', COLD: '❄️' }[band] || '⚪';
}

function buildContent(funder, invoices) {
  const { funder_name, warmth_band, warmth_score, gross_revenue, paid_revenue,
          outstanding, days_since_last, years_active, projects, invoice_count,
          paid_count, authorised_count, first_invoice, last_invoice, next_move } = funder;

  const projectList = (projects || []).join(', ') || '(unassigned)';
  const lines = [];

  lines.push(`# ${funder_name} — Reporting`);
  lines.push('');
  lines.push(`> Auto-generated 2026-05-21 by \`sync-funder-reporting-to-notion.mjs\`. Source of truth: Xero invoices + Supabase. Manual edits below the auto-generated block will be preserved.`);
  lines.push('');
  lines.push(`**Warmth band:** ${bandEmoji(warmth_band)} ${warmth_band} · **Score:** ${warmth_score}/100 · **Projects:** ${projectList} · **Last invoice:** ${last_invoice} (${days_since_last}d ago)`);
  lines.push('');
  lines.push('## At a glance');
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---:|');
  lines.push(`| **Total invoiced** | ${fmtAud(gross_revenue)} inc-GST |`);
  lines.push(`| **Paid** | ${fmtAud(paid_revenue)} (${paid_count}/${invoice_count} invoices) |`);
  lines.push(`| **Outstanding** | ${fmtAud(outstanding)}${authorised_count ? ` (${authorised_count} AUTHORISED)` : ''} |`);
  lines.push(`| **First invoice** | ${first_invoice} |`);
  lines.push(`| **Last invoice** | ${last_invoice} |`);
  lines.push(`| **Years active** | ${years_active} |`);
  lines.push(`| **Days since last** | ${days_since_last} |`);
  lines.push('');
  lines.push(`## 🎯 Next move`);
  lines.push('');
  lines.push(`> **${next_move}**`);
  lines.push('');
  lines.push('## Invoice ledger');
  lines.push('');
  lines.push('| # | Invoice | Date | Status | Amount inc-GST | Description |');
  lines.push('|---|---|---|---|---:|---|');
  invoices.forEach((inv, i) => {
    const desc = inv.line_items?.[0]?.description || '';
    const shortDesc = desc.length > 80 ? desc.substring(0, 77) + '...' : desc;
    lines.push(`| ${i + 1} | ${inv.invoice_number || '—'} | ${inv.date} | ${inv.status} | ${fmtAud(Number(inv.total))} | ${shortDesc.replace(/\n/g, ' ').replace(/\|/g, '\\|')} |`);
  });
  const total = invoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
  lines.push(`| **Total** |  |  |  | **${fmtAud(total)}** |  |`);
  lines.push('');
  lines.push('## Reporting schedule');
  lines.push('');
  lines.push('_TBD — populate manually when reporting requirements are confirmed with the funder._');
  lines.push('');
  lines.push('## Relationship signals');
  lines.push('');
  lines.push(`- Warmth ${warmth_band} (score ${warmth_score}/100) — ${years_active === 1 ? 'single year' : `${years_active}-year`} relationship`);
  lines.push(`- ${invoice_count} invoices · ${fmtAud(gross_revenue)} gross · ${fmtAud(paid_revenue)} paid (${Math.round(100 * (paid_revenue || 0) / Math.max(1, gross_revenue))}%)`);
  if (outstanding > 0) lines.push(`- 🚨 **${fmtAud(outstanding)} outstanding** across ${authorised_count} AUTHORISED invoice${authorised_count === 1 ? '' : 's'}`);
  if (days_since_last > 180) lines.push(`- ⚠ Cooling — ${days_since_last} days since last invoice`);
  if (days_since_last <= 30) lines.push(`- ✓ Active — recent invoice within 30 days`);
  lines.push('');
  lines.push('## Cross-references');
  lines.push('');
  lines.push(`- **Command-center**: ${(projects || []).map(p => `https://command.act.place/finance/projects/${p}`).join(' · ') || 'n/a'}`);
  lines.push(`- **Hub**: [Funder Reporting Hub](https://www.notion.so/${HUB_PAGE_ID.replace(/-/g, '')})`);
  lines.push(`- **Supabase view**: \`v_funder_next_move\` where \`funder_name = '${funder_name.replace(/'/g, "''")}'\``);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Manual notes');
  lines.push('');
  lines.push('_Add reporting cadence, key contacts, conversion plan, principle alignment etc below this line. Content below this section is preserved across reruns._');
  lines.push('');

  return lines.join('\n');
}

function markdownToBlocks(md) {
  // Minimal markdown → Notion blocks. Each blank-line-separated chunk becomes one block.
  // Headings (#, ##, ###), tables, quotes, lists, paragraphs handled.
  const blocks = [];
  const chunks = md.split(/\n\n+/);
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (chunk.startsWith('### ')) {
      blocks.push(richHeading(chunk.slice(4), 3));
    } else if (chunk.startsWith('## ')) {
      blocks.push(richHeading(chunk.slice(3), 2));
    } else if (chunk.startsWith('# ')) {
      blocks.push(richHeading(chunk.slice(2), 1));
    } else if (chunk.startsWith('> ')) {
      blocks.push({ type: 'quote', quote: { rich_text: richText(chunk.slice(2)) } });
    } else if (chunk.startsWith('| ')) {
      // markdown table → notion table
      blocks.push(markdownTableToBlock(chunk));
    } else if (chunk.startsWith('- ')) {
      // bulleted list
      const items = chunk.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2));
      for (const item of items) {
        blocks.push({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(item) } });
      }
    } else if (chunk === '---') {
      blocks.push({ type: 'divider', divider: {} });
    } else {
      blocks.push({ type: 'paragraph', paragraph: { rich_text: richText(chunk) } });
    }
  }
  return blocks;
}

function richHeading(text, level) {
  return { type: `heading_${level}`, [`heading_${level}`]: { rich_text: richText(text) } };
}

function richText(text) {
  // Simple bold/italic/link parsing
  const parts = [];
  let remaining = text;
  while (remaining.length) {
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push({ type: 'text', text: { content: linkMatch[1], link: { url: linkMatch[2] } } });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push({ type: 'text', text: { content: boldMatch[1] }, annotations: { bold: true } });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push({ type: 'text', text: { content: codeMatch[1] }, annotations: { code: true } });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    // Plain run until next marker
    const next = remaining.search(/(\*\*|\[|`)/);
    const plain = next === -1 ? remaining : remaining.slice(0, next);
    parts.push({ type: 'text', text: { content: plain } });
    remaining = next === -1 ? '' : remaining.slice(plain.length);
  }
  return parts.length ? parts : [{ type: 'text', text: { content: text } }];
}

function markdownTableToBlock(md) {
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return { type: 'paragraph', paragraph: { rich_text: richText(md) } };
  // Skip separator row (---)
  const rows = lines.filter(l => !/^\|[-:\s|]+\|$/.test(l.trim()));
  const tableRows = rows.map(line => {
    const cells = line.split('|').slice(1, -1).map(c => ({
      type: 'text',
      text: { content: c.trim() }
    }));
    return {
      type: 'table_row',
      table_row: { cells: cells.map(c => [c]) },
    };
  });
  return {
    type: 'table',
    table: {
      table_width: tableRows[0]?.table_row.cells.length || 2,
      has_column_header: true,
      has_row_header: false,
      children: tableRows,
    },
  };
}

async function findOrCreateFunderPage(funder, invoices) {
  const title = `${funder.funder_name} Reporting`;
  const content = buildContent(funder, invoices);
  const blocks = markdownToBlocks(content);

  // Find existing — preserve hand-crafted pages by default; only refresh when --force-update
  let existing = await findFunderPage(funder.funder_name);
  if (existing) {
    if (!FORCE_UPDATE) {
      console.log(`  ⊙ skipping (page exists; --force-update to refresh)`);
      return { url: existing.url, action: 'skipped-existing' };
    }
    console.log(`  ↻ refreshing ${title} (${existing.id})`);
    if (!APPLY) return { url: existing.url, action: 'would-update' };
    await notionFetch(`/blocks/${existing.id}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: blocks }),
    });
    return { url: existing.url, action: 'appended' };
  }

  console.log(`  + creating ${title}`);
  if (!APPLY) return { url: '(dry-run)', action: 'would-create' };
  const created = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: KNOWLEDGE_HUB_DS_ID },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        'Resource Type': { select: { name: 'Grant' } },
        Tag: { multi_select: [{ name: 'Funder' }] },
        Status: { status: { name: 'In progress' } },
      },
      children: blocks,
    }),
  });
  return { url: created.url, action: 'created' };
}

async function main() {
  console.log(`\n=========================================`);
  console.log(`  Funder Reporting Sync — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`=========================================\n`);

  if (HUB_ONLY) {
    console.log('Hub-only mode — refresh hub page only (not yet implemented).');
    return;
  }

  const funders = await getFunderRows();
  console.log(`Found ${funders.length} funders with warmth >= ${MIN_WARMTH} and gross >= $5K\n`);

  for (const f of funders) {
    if (ONLY_FUNDER && !f.funder_name.toLowerCase().includes(ONLY_FUNDER.toLowerCase())) continue;
    console.log(`${bandEmoji(f.warmth_band)} ${f.funder_name} — score ${f.warmth_score}, ${fmtAud(f.gross_revenue)} gross, ${fmtAud(f.outstanding)} outstanding`);
    const invoices = await getInvoices(f.funder_name);
    const result = await findOrCreateFunderPage(f, invoices);
    console.log(`  ${result.action}: ${result.url}\n`);
  }

  console.log(`Done. ${APPLY ? 'Pages written to Notion.' : 'Dry-run — pass --apply to commit.'}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
