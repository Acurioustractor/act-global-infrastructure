#!/usr/bin/env node
/**
 * Weekly Reconciliation Cron
 *
 * Runs every Monday morning (or on demand). Does:
 *   1. Checks for new statement lines needing processing
 *   2. Runs project tagger on untagged lines
 *   3. Runs receipt matcher on unmatched lines
 *   4. Classifies no-receipt-needed items
 *   5. Generates BAS readiness score
 *   6. Sends summary via Telegram
 *   7. Lists what needs human attention
 *
 * Usage:
 *   node scripts/weekly-reconciliation.mjs                # Full run + Telegram
 *   node scripts/weekly-reconciliation.mjs --no-telegram  # Full run, no notification
 *   node scripts/weekly-reconciliation.mjs --quarter Q2   # Specific quarter
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const NO_TELEGRAM = process.argv.includes('--no-telegram');
const GST_THRESHOLD = 82.50;

// Determine current FY quarter
function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  if (month >= 6 && month <= 8) return 'Q1';
  if (month >= 9 && month <= 11) return 'Q2';
  if (month >= 0 && month <= 2) return 'Q3';
  return 'Q4';
}

function getQuarterDates(q) {
  const now = new Date();
  const fy = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const quarters = {
    Q1: [`${fy - 1}-07-01`, `${fy - 1}-09-30`],
    Q2: [`${fy - 1}-10-01`, `${fy - 1}-12-31`],
    Q3: [`${fy}-01-01`, `${fy}-03-31`],
    Q4: [`${fy}-04-01`, `${fy}-06-30`],
  };
  return quarters[q] || quarters[getCurrentQuarter()];
}

const quarter = process.argv.find(a => a.match(/^Q[1-4]$/)) || getCurrentQuarter();
const [fromDate, toDate] = getQuarterDates(quarter);

async function sendTelegram(message) {
  if (NO_TELEGRAM) {
    console.log('\n[Telegram message would be sent]:');
    console.log(message);
    return;
  }

  try {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_BK_CHAT_ID;
    if (!TELEGRAM_TOKEN || !CHAT_ID) {
      console.log('⚠️  No Telegram credentials — skipping notification');
      return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    console.log('✅ Telegram notification sent');
  } catch (e) {
    console.log('⚠️  Telegram send failed:', e.message);
  }
}

function runScript(name, args = '') {
  try {
    console.log(`   Running ${name}...`);
    execSync(`node scripts/${name} ${args}`, {
      cwd: '/Users/benknight/Code/act-global-infrastructure',
      stdio: 'pipe',
      timeout: 120_000,
    });
    console.log(`   ✅ ${name} complete`);
  } catch (e) {
    console.log(`   ⚠️  ${name} failed: ${e.message?.split('\n')[0]}`);
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`\n🔄 Weekly Reconciliation — ${quarter} FY26 (${fromDate} to ${toDate})\n`);

  // Step 1: Run tagger + matcher to update state before computing stats
  console.log('📋 Step 1: Update tags and matches...');
  runScript('tag-statement-lines.mjs', '--apply');
  runScript('reconciliation-report.mjs', '--match --apply');
  runScript('tag-lanes.mjs', '--apply');
  runScript('tag-lcaa-phases.mjs', '--apply');
  runScript('four-lanes-snapshot.mjs', '');

  // Step 2: Load all statement lines for the quarter (paginate past 1000-row cap)
  console.log('\n📊 Step 2: Computing stats...');
  const lines = [];
  let pg = 0;
  while (true) {
    const { data: batch } = await sb.from('bank_statement_lines')
      .select('*')
      .gte('date', fromDate).lte('date', toDate)
      .eq('direction', 'debit')
      .range(pg * 1000, (pg + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    lines.push(...batch);
    if (batch.length < 1000) break;
    pg++;
  }

  const totalLines = lines.length;
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.amount), 0);

  // Count current state
  const matched = lines.filter(l => l.receipt_match_status === 'matched');
  const noReceipt = lines.filter(l => l.receipt_match_status === 'no_receipt_needed');
  const unmatched = lines.filter(l => l.receipt_match_status !== 'matched' && l.receipt_match_status !== 'no_receipt_needed');
  const tagged = lines.filter(l => l.project_code);
  const untagged = lines.filter(l => !l.project_code);

  const matchedValue = matched.reduce((s, l) => s + parseFloat(l.amount), 0);
  const noReceiptValue = noReceipt.reduce((s, l) => s + parseFloat(l.amount), 0);
  const coveredValue = matchedValue + noReceiptValue;
  const coveredCount = matched.length + noReceipt.length;

  // Missing receipts over GST threshold
  const needReceipts = unmatched.filter(l => parseFloat(l.amount) >= GST_THRESHOLD);
  const needReceiptsValue = needReceipts.reduce((s, l) => s + parseFloat(l.amount), 0);

  // Subscription check — find subscriptions without a recent charge
  const { data: subs } = await sb.from('subscription_patterns')
    .select('*').eq('active', true);

  const missingSubs = [];
  for (const sub of subs) {
    const pattern = sub.vendor_pattern.toUpperCase();
    const hasCharge = lines.some(l =>
      (l.particulars || '').toUpperCase().includes(pattern) ||
      (l.payee || '').toUpperCase().includes(pattern)
    );
    if (!hasCharge && !sub.no_receipt_needed) {
      missingSubs.push(sub);
    }
  }

  // Project breakdown
  const byProject = {};
  for (const l of lines) {
    const p = l.project_code || 'UNTAGGED';
    if (!byProject[p]) byProject[p] = { count: 0, total: 0 };
    byProject[p].count++;
    byProject[p].total += parseFloat(l.amount);
  }

  // R&D eligible lines
  const rdLines = lines.filter(l => l.rd_eligible);
  const rdValue = rdLines.reduce((s, l) => s + parseFloat(l.amount), 0);
  const rdUnmatched = rdLines.filter(l => l.receipt_match_status === 'unmatched');
  const rdUnmatchedValue = rdUnmatched.reduce((s, l) => s + parseFloat(l.amount), 0);
  const rdOffsetAtRisk = Math.round(rdUnmatchedValue * 0.435);

  // Top 5 need-receipt items
  const topNeed = needReceipts
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, 5);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Console output
  console.log(`📊 BAS Readiness: ${((coveredValue / totalValue) * 100).toFixed(1)}% by value`);
  console.log(`   ✅ Matched: ${matched.length} ($${matchedValue.toFixed(0)})`);
  console.log(`   ⬜ No receipt needed: ${noReceipt.length} ($${noReceiptValue.toFixed(0)})`);
  console.log(`   🔴 Missing receipts (>$${GST_THRESHOLD}): ${needReceipts.length} ($${needReceiptsValue.toFixed(0)})`);
  console.log(`   🏷️  Tagged: ${tagged.length}/${totalLines} | Untagged: ${untagged.length}`);
  console.log(`   🔬 R&D eligible: ${rdLines.length} lines ($${rdValue.toFixed(0)}) | Offset at risk: $${rdOffsetAtRisk}`);

  if (topNeed.length > 0) {
    console.log(`\n   Top missing receipts:`);
    for (const l of topNeed) {
      console.log(`     ${l.date} ${(l.payee || '?').padEnd(25)} $${parseFloat(l.amount).toFixed(2).padStart(10)} ${l.project_code || '???'}`);
    }
  }

  console.log(`\n   Project spend:`);
  for (const [proj, data] of Object.entries(byProject).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`     ${proj.padEnd(12)} $${data.total.toFixed(0).padStart(8)} (${data.count} items)`);
  }

  // Telegram message
  const pctValue = ((coveredValue / totalValue) * 100).toFixed(1);
  let msg = `📊 *Weekly Reconciliation — ${quarter} FY26*\n\n`;
  msg += `*BAS Readiness: ${pctValue}%* (by value)\n`;
  msg += `✅ Matched: ${matched.length} items ($${matchedValue.toFixed(0)})\n`;
  msg += `⬜ No receipt: ${noReceipt.length} items ($${noReceiptValue.toFixed(0)})\n`;
  msg += `🔴 Missing (>$${GST_THRESHOLD}): ${needReceipts.length} items ($${needReceiptsValue.toFixed(0)})\n`;
  msg += `🏷️ Tagged: ${tagged.length}/${totalLines} | Untagged: ${untagged.length}\n`;
  msg += `🔬 R&D: $${rdValue.toFixed(0)} eligible | $${rdOffsetAtRisk} offset at risk\n`;

  if (topNeed.length > 0) {
    msg += `\n*Need receipts:*\n`;
    for (const l of topNeed) {
      msg += `• ${l.date} ${l.payee || '?'} $${parseFloat(l.amount).toFixed(2)}\n`;
    }
  }

  msg += `\n*Spend by project:*\n`;
  for (const [proj, data] of Object.entries(byProject).sort((a, b) => b[1].total - a[1].total).slice(0, 6)) {
    msg += `• ${proj}: $${data.total.toFixed(0)} (${data.count})\n`;
  }

  // ── Step 3: Learning loop — detect new patterns ────────────────
  console.log('\n🧠 Step 3: Learning loop...');
  let learnings = 0;
  let subInserted = 0;

  // Detect new subscription patterns: vendors with 2+ charges at similar amounts
  const vendorCharges = {};
  for (const l of lines) {
    const key = (l.payee || '').toUpperCase().trim();
    if (!key) continue;
    if (!vendorCharges[key]) vendorCharges[key] = [];
    vendorCharges[key].push(parseFloat(l.amount));
  }

  const { data: existingSubs } = await sb.from('subscription_patterns')
    .select('vendor_pattern').eq('active', true);
  const existingPatterns = new Set((existingSubs || []).map(s => s.vendor_pattern.toUpperCase()));

  for (const [vendor, amounts] of Object.entries(vendorCharges)) {
    if (amounts.length < 2) continue;
    if (existingPatterns.has(vendor)) continue;
    // Check if amounts are consistent (within 20% of median)
    const sorted = amounts.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const consistent = amounts.every(a => Math.abs(a - median) / median < 0.2);
    if (consistent && median > 5) {
      const projLine = lines.find(l => (l.payee || '').toUpperCase().trim() === vendor && l.project_code);
      const projCode = projLine?.project_code || 'ACT-IN';
      console.log(`   📌 Subscription: ${vendor} ~$${median.toFixed(2)} (${amounts.length}x) → ${projCode}`);
      learnings++;

      // Auto-insert if 3+ charges (high confidence)
      if (amounts.length >= 3) {
        const { error } = await sb.from('subscription_patterns')
          .upsert({
            vendor_name: vendor.split(' ')[0], // first word as display name
            vendor_pattern: vendor,
            expected_amount: Math.round(median * 100) / 100,
            project_code: projCode,
            frequency: 'monthly',
            active: true,
            last_seen_at: new Date().toISOString().slice(0, 10),
          }, { onConflict: 'vendor_pattern' });
        if (!error) subInserted++;
      }
    }
  }

  // Detect new location patterns: tagged lines with location info not in rules
  const { data: existingLocs } = await sb.from('location_project_rules').select('location_pattern');
  const existingLocSet = new Set((existingLocs || []).map(l => l.location_pattern.toUpperCase()));

  // Noise: Xero status text, generic terms, major cities (too broad), payment types
  const LOC_NOISE = new Set([
    'BANK', 'FEED', 'AUTO', 'RECONCILED', 'AUTO-RECONCILED', 'UNRECONCILED',
    'CARD', 'PURCHASE', 'CREDIT', 'DEBIT', 'CHARGED', 'PAYMENT', 'REFUND',
    'SYDNEY', 'MELBOURNE', 'BRISBANE', 'PERTH', 'ADELAIDE', 'DARWIN',
    'HILLS', 'SOUTH', 'NORTH', 'EAST', 'WEST', 'PARK', 'CREEK',
    '(MC)', '(SC)', '(VISA)', 'XXXXXXXXXXXXXXX1656',
    'PTY', 'LTD', 'LIMITED', 'INC', 'CORP', 'TRUST',
    'AUSTRALIA', 'AUSTRALIAN', 'INTERNATIONAL',
    'HELP.UBER.COM', 'OPENAI.COM', 'ANTHROPIC.COMCA', 'WEBFLOW.COM',
    'SQUARESPACE.CNY', 'GOHIGHLEVEL.CTX', 'VERCEL.COM',
    'WORKSPACE_THEHARVESYDNEY', 'RESTAURANMALENY',
    'CHAI', 'AIRP', 'SPRINGS',
  ]);

  const locationCandidates = {};
  for (const l of lines) {
    if (!l.project_code || !l.particulars) continue;
    // Strip Xero status text from particulars before extracting location
    const clean = (l.particulars || '')
      .replace(/Bank Feed.*$/i, '')
      .replace(/Credit Card.*$/i, '')
      .replace(/Fee - Charged.*$/i, '')
      .replace(/Miscellaneous.*$/i, '')
      .replace(/XXXXXXX+\d+/g, '')
      .trim();
    if (!clean) continue;

    // Take last word as potential suburb/city
    const parts = clean.split(/\s+/);
    const lastWord = (parts[parts.length - 1] || '').toUpperCase();
    if (lastWord.length < 4 || existingLocSet.has(lastWord)) continue;
    if (LOC_NOISE.has(lastWord)) continue;
    if (/^\d/.test(lastWord) || /[.\/()]/.test(lastWord)) continue;
    const key = `${lastWord}:${l.project_code}`;
    if (!locationCandidates[key]) locationCandidates[key] = 0;
    locationCandidates[key]++;
  }

  let locInserted = 0;
  for (const [key, count] of Object.entries(locationCandidates)) {
    if (count >= 3) {
      const [loc, proj] = key.split(':');
      if (LOC_NOISE.has(loc)) continue;
      console.log(`   📍 Location rule: ${loc} → ${proj} (${count} charges)`);
      learnings++;

      // Auto-insert into location_project_rules
      const { error } = await sb.from('location_project_rules')
        .upsert({
          location_pattern: loc,
          project_code: proj,
          notes: `Auto-detected: ${count} charges in ${quarter} FY26`,
        }, { onConflict: 'location_pattern' });

      if (!error) locInserted++;
      else console.log(`     ⚠️  Insert failed: ${error.message}`);
    }
  }

  if (locInserted > 0 || subInserted > 0) {
    console.log(`   💾 Inserted ${locInserted} location rules, ${subInserted} subscriptions`);
  }

  if (learnings === 0) {
    console.log('   No new patterns detected');
  } else {
    msg += `\n🧠 *${learnings} patterns* (${locInserted} locations + ${subInserted} subs auto-added)`;
  }

  // ── Step 4: Four lanes + soul check ────────────────────────────
  // Reads the lane / lcaa_phase tags written above by tag-lcaa-phases.mjs.
  // Methodology: wiki/concepts/four-lanes.md and wiki/concepts/lcaa-method.md.
  console.log('\n💰 Step 4: Four lanes + soul check...');
  const laneRows = lines; // already loaded for this quarter, has lane + lcaa_phase
  const laneTotals = { to_us: 0, to_down: 0, to_grow: 0, to_others: 0 };
  const phaseTotals = { listen: 0, curiosity: 0, action: 0, art: 0 };
  for (const r of laneRows) {
    if (laneTotals[r.lane] !== undefined) laneTotals[r.lane] += parseFloat(r.amount);
    if (phaseTotals[r.lcaa_phase] !== undefined) phaseTotals[r.lcaa_phase] += parseFloat(r.amount);
  }

  const LANE_LABELS = { to_us: 'To Us', to_down: 'To Down', to_grow: 'To Grow', to_others: 'To Others' };
  const SOUL_CHECK = {
    to_us: "When did Ben and Nic last get paid by the entity that earns the money? If the answer is 'not this quarter', that is the work.",
    to_down: "What old liability is unblocked by clearing this quarter? Receivables, ATO, legacy debts. Pick one.",
    to_grow: "Which project most needs the next dollar? Equipment, sites, engineering hours, travel.",
    to_others: "Which community partner hasn't had a fellowship or anchor payment yet? Make the list.",
  };
  const orderedLanes = ['to_us', 'to_down', 'to_grow', 'to_others'];
  let mostBehind = orderedLanes[0];
  for (const l of orderedLanes) if (laneTotals[l] < laneTotals[mostBehind]) mostBehind = l;

  const phaseSum = Object.values(phaseTotals).reduce((a, b) => a + b, 0);
  const fmtPct = (n) => phaseSum > 0 ? Math.round((n / phaseSum) * 100) + '%' : '0%';

  console.log(`   Lane: To Us $${Math.round(laneTotals.to_us)} · To Down $${Math.round(laneTotals.to_down)} · To Grow $${Math.round(laneTotals.to_grow)} · To Others $${Math.round(laneTotals.to_others)}`);
  console.log(`   LCAA: L ${fmtPct(phaseTotals.listen)} · C ${fmtPct(phaseTotals.curiosity)} · A ${fmtPct(phaseTotals.action)} · Art ${fmtPct(phaseTotals.art)}`);
  console.log(`   Lane most behind: ${LANE_LABELS[mostBehind]} ($${Math.round(laneTotals[mostBehind])})`);

  msg += `\n\n💰 *Four lanes (${quarter} FY26):*\n`;
  msg += `To Us $${Math.round(laneTotals.to_us)} · To Down $${Math.round(laneTotals.to_down)} · To Grow $${Math.round(laneTotals.to_grow)} · To Others $${Math.round(laneTotals.to_others)}\n`;
  if (phaseSum > 0) {
    msg += `LCAA: L ${fmtPct(phaseTotals.listen)} · C ${fmtPct(phaseTotals.curiosity)} · A ${fmtPct(phaseTotals.action)} · Art ${fmtPct(phaseTotals.art)}\n`;
  }
  msg += `\n🌱 *Soul check:* lane most behind = *${LANE_LABELS[mostBehind]}* ($${Math.round(laneTotals[mostBehind])}).\n${SOUL_CHECK[mostBehind]}`;

  msg += `\n\n_Run reconciliation-report.mjs for full details_`;

  await sendTelegram(msg);

  console.log(`\n✅ Done in ${duration}s`);
}

main().catch(e => { console.error(e); process.exit(1); });
