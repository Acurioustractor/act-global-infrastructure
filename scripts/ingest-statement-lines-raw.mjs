#!/usr/bin/env node
/**
 * Parse raw Xero bank statement lines from a text file and ingest into Supabase.
 *
 * Usage:
 *   node scripts/ingest-statement-lines-raw.mjs <file>
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/ingest-statement-lines-raw.mjs <file>'); process.exit(1); }

const raw = readFileSync(file, 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

const rows = [];
for (const line of lines) {
  // Skip header rows and non-data rows
  if (line.includes('Statement lines') || line.includes('No transactions selected') || line.includes('transactions selected')) continue;
  if (line.trim().startsWith('Date') && line.includes('Type') && line.includes('Payee')) continue;
  if (line.trim().startsWith('Showing')) continue;

  // Parse tab-separated or multi-space-separated fields
  // Format: Date | Type | Payee(empty) | Particulars | Code | Reference | Analysis Code | Spent | Received | Source | Status
  const parts = line.split(/\t/).map(s => s.trim()).filter(s => s !== '');

  if (parts.length < 5) continue;

  // Try to find the date
  const dateMatch = parts[0]?.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/);
  if (!dateMatch) continue;

  const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
  const day = dateMatch[1].padStart(2, '0');
  const month = months[dateMatch[2]];
  const year = dateMatch[3];
  const date = `${year}-${month}-${day}`;

  const type = parts[1]; // Debit, Credit, Interest

  // Particulars is usually the longest descriptive field
  // The payee field in Xero export is often empty (the 3rd column)
  // Particulars contains the actual merchant description
  let particulars = '';
  let analysisCode = '';
  let spent = '';
  let received = '';
  let source = '';
  let status = '';

  // Find spent/received amounts (look for numbers with commas/decimals)
  const amountPattern = /^[\d,]+\.\d{2}$/;

  // Work backwards from the end to find status, source, amounts
  const reverseParts = [...parts].reverse();

  // Status is last: Reconciled or Unreconciled
  if (reverseParts[0] === 'Reconciled' || reverseParts[0] === 'Unreconciled') {
    status = reverseParts[0].toLowerCase();
    reverseParts.shift();
  }

  // Source: Bank Feed or User
  if (reverseParts[0] === 'Bank Feed' || reverseParts[0] === 'User') {
    source = reverseParts[0].toLowerCase().replace(' ', '_');
    reverseParts.shift();
  }

  // Now find amounts - could be spent, received, or both
  // For credits: received has value, spent is empty
  // For debits: spent has value, received is empty
  let amount = 0;
  let direction = 'debit';

  if (type === 'Credit') {
    direction = 'credit';
    // Find the amount - it should be in received column
    for (let i = 0; i < reverseParts.length; i++) {
      const clean = reverseParts[i].replace(/,/g, '');
      if (amountPattern.test(clean)) {
        amount = parseFloat(clean);
        reverseParts.splice(i, 1);
        break;
      }
    }
  } else {
    direction = 'debit';
    for (let i = 0; i < reverseParts.length; i++) {
      const clean = reverseParts[i].replace(/,/g, '');
      if (amountPattern.test(clean)) {
        amount = parseFloat(clean);
        reverseParts.splice(i, 1);
        break;
      }
    }
  }

  if (amount === 0) continue;

  // Analysis code patterns
  const acPatterns = ['Credit Card Purchase', 'Credit Card Payment', 'Credit Card Refund', 'Credit Card Cash Advance', 'Fee - Charged', 'Interest', 'Adjustment'];
  for (let i = 0; i < reverseParts.length; i++) {
    if (acPatterns.some(p => reverseParts[i].includes(p) || p.includes(reverseParts[i]))) {
      analysisCode = reverseParts[i];
      reverseParts.splice(i, 1);
      break;
    }
  }

  // Reference/Code - usually the card number XXXXXXX or empty
  for (let i = reverseParts.length - 1; i >= 0; i--) {
    if (reverseParts[i].match(/^X{5,}/)) {
      reverseParts.splice(i, 1);
      break;
    }
  }

  // What's left (reversed back) is the particulars
  reverseParts.reverse();
  // Remove the date and type from the front
  const remaining = reverseParts.slice(0); // already stripped
  particulars = remaining.join(' ').trim();

  // Remove the date and type if they snuck in
  particulars = particulars.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s+/, '');
  particulars = particulars.replace(/^(Debit|Credit|Interest)\s+/, '');

  // Extract a clean payee from particulars
  let payee = particulars.split(/\s{2,}/)[0] || particulars.split(' ').slice(0, 3).join(' ');
  // Clean up common patterns
  payee = payee.replace(/XXXXXXX\w+/, '').trim();

  // Better payee extraction — use known patterns
  const payeeMap = [
    [/QANTAS AIR/i, 'Qantas'], [/QANTAS AIRW/i, 'Qantas'], [/^Qantas/i, 'Qantas'],
    [/UBER \*/i, 'Uber'], [/UberDirect/i, 'Uber'],
    [/WEBFLOW/i, 'Webflow'], [/OPENAI/i, 'OpenAI'], [/CLAUDE\.AI/i, 'Claude.AI'],
    [/ANTHROPIC/i, 'Anthropic'], [/NOTION LABS/i, 'Notion Labs'], [/SUPABASE/i, 'Supabase'],
    [/BUNNINGS/i, 'Bunnings'], [/KENNARDS/i, 'Kennards Hire'], [/CONTAINER OPTIONS/i, 'Container Options'],
    [/THE SAND YARD/i, 'The Sand Yard'], [/EDMONDS LANDSCAPING/i, 'Edmonds Landscaping'],
    [/HATCH ELECTRICAL/i, 'Hatch Electrical'], [/RNM CARPENTRY/i, 'RNM Carpentry'],
    [/ALLCLASS/i, 'Allclass'], [/DEFYDESIGN/i, 'Defy Design'], [/LOADSHIFT/i, 'Loadshift Sydney'],
    [/NAB INTNL TRAN/i, 'NAB International Fee'], [/NAB INTNL/i, 'NAB International Fee'],
    [/INTERNET PAYMENT/i, 'Internet Payment'], [/INTERNET TRANSFER/i, 'Internet Transfer'],
    [/INTERNET BANKING/i, 'Internet Banking Transfer'],
    [/MIGHTY NETWORKS/i, 'Mighty Networks'], [/APPLE\.COM/i, 'Apple'], [/APPLE R\d/i, 'Apple'],
    [/DIALPAD/i, 'Dialpad'], [/ZAPIER/i, 'Zapier'], [/FIGMA/i, 'Figma'],
    [/VIRGIN AUSTRALIA/i, 'Virgin Australia'], [/TELSTRA/i, 'Telstra'],
    [/GoPayID/i, 'GoPayID'], [/GOJEK/i, 'Gojek'], [/HIGHLEVEL/i, 'GoHighLevel'],
    [/OFFICEWORKS/i, 'Officeworks'], [/CODEGUIDE/i, 'Codeguide'], [/FIRECRAWL/i, 'Firecrawl'],
    [/VERCEL/i, 'Vercel'], [/DESCRIPT/i, 'Descript'], [/STARLINK/i, 'Starlink'],
    [/WOOLWORTHS/i, 'Woolworths'], [/COLES/i, 'Coles'], [/ALDI/i, 'Aldi'],
    [/AIRBNB/i, 'Airbnb'], [/Booking\.com/i, 'Booking.com'], [/BUDGET RENT/i, 'Budget Rent A Car'],
    [/BARGAINCAR/i, 'Bargain Car Rentals'], [/AVIS AUSTRALIA/i, 'Avis'],
    [/GOGET/i, 'GoGet'], [/CABCHARGE/i, 'Cabcharge'], [/TAXIPAY/i, 'Taxipay'],
    [/CabFare/i, 'CabFare'], [/RELAY/i, 'Relay'],
    [/AGL/i, 'AGL'], [/BELONG/i, 'Belong'], [/XERO AU/i, 'Xero'],
    [/DOCPLAY/i, 'DocPlay'], [/Audible/i, 'Audible'], [/LINKTREE/i, 'Linktree'],
    [/AMAZON/i, 'Amazon'], [/AMZNPRIME/i, 'Amazon Prime'],
    [/NAPKIN AI/i, 'Napkin AI'], [/SQSP\*/i, 'Squarespace'], [/X CORP/i, 'X Corp'],
    [/UPDOC/i, 'Updoc'], [/Adobe/i, 'Adobe'], [/DEXT/i, 'Dext'],
    [/BIONIC STORAGE/i, 'Bionic Storage'], [/PIGGYBACK/i, 'Piggyback'],
    [/POLOLA/i, 'Polola'], [/CARLA FURNISHERS/i, 'Carla Furnishers'],
    [/NRMA/i, 'NRMA Insurance'], [/AIG Australia/i, 'AIG Australia'],
    [/ATO Payment/i, 'ATO'], [/THRIDAY/i, 'Thriday'],
    [/CURRY\*/i, 'Cursor AI'], [/CURSOR/i, 'Cursor AI'],
    [/RAILWAY/i, 'Railway'], [/LinkedInPreC/i, 'LinkedIn'],
    [/NEWS PTY/i, 'News Pty Limited'], [/EZVIZ/i, 'Ezviz'],
    [/Garmin/i, 'Garmin'], [/KMART/i, 'Kmart'],
    [/C ADV INTERNET/i, 'NAB Cash Advance Fee'],
    [/INTEREST ON CASH/i, 'NAB Interest'],
    [/STRATCO/i, 'Stratco'], [/HARVEY NORMAN/i, 'Harvey Norman'],
    [/WOODFORDIA/i, 'Woodfordia'], [/BOE DESIGN/i, 'BOE Design'],
    [/TELFORD SMITH/i, 'Telford Smith Engine'],
    [/NIGHTOWL/i, 'Nightowl'], [/LIBERTY/i, 'Liberty'],
    [/BRIDGECLIMB/i, 'BridgeClimb'], [/REDBALLOON/i, 'RedBalloon'],
    [/TRADEMUTT/i, 'TradeMutt'], [/FLYPARKS/i, 'Flyparks'],
    [/OVARIAN CANCER/i, 'Ovarian Cancer Australia'],
  ];

  for (const [pattern, name] of payeeMap) {
    if (pattern.test(particulars)) {
      payee = name;
      break;
    }
  }

  rows.push({
    date,
    type: type === 'Credit' ? 'Credit' : 'Debit',
    payee,
    particulars,
    analysis_code: analysisCode || (type === 'Interest' ? 'Interest' : 'Credit Card Purchase'),
    amount,
    direction,
    source: source || 'bank_feed',
    status: status || 'unreconciled',
    bank_account: 'NAB Visa ACT #8815',
    card_last4: '1656',
  });
}

console.log(`Parsed ${rows.length} statement lines from ${file}`);
console.log(`Date range: ${rows[rows.length-1]?.date} to ${rows[0]?.date}`);

// Ingest
let inserted = 0;
let skipped = 0;
const BATCH = 20;

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  for (const row of batch) {
    const { error } = await sb.from('bank_statement_lines')
      .upsert([row], { onConflict: 'date,payee,amount,direction,particulars', ignoreDuplicates: true });
    if (error) {
      // Try without particulars match (some have slight differences)
      skipped++;
    } else {
      inserted++;
    }
  }
}

console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`);

// Summary
const { count: total } = await sb.from('bank_statement_lines').select('*', { count: 'exact', head: true });
const { count: unrec } = await sb.from('bank_statement_lines').select('*', { count: 'exact', head: true }).eq('status', 'unreconciled');
console.log(`\nTotal in DB: ${total}, Unreconciled: ${unrec}`);

// Auto-run tagger + matcher if we inserted lines
if (inserted > 0 && !process.argv.includes('--no-pipeline')) {
  const CWD = process.cwd();
  const run = (name, args = '') => {
    try {
      console.log(`\n🔄 Running ${name}...`);
      execSync(`node scripts/${name} ${args}`, { cwd: CWD, stdio: 'inherit', timeout: 120_000 });
    } catch (e) {
      console.log(`⚠️  ${name} failed: ${e.message?.split('\n')[0]}`);
    }
  };

  run('tag-statement-lines.mjs', '--apply');
  run('reconciliation-report.mjs', '--match --apply');

  // Set R&D flags on newly tagged lines
  const { error } = await sb.from('bank_statement_lines')
    .update({ rd_eligible: true })
    .in('project_code', ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD'])
    .eq('rd_eligible', false);
  if (!error) console.log('✅ R&D flags updated');

  console.log('\n✅ Pipeline complete: ingested → tagged → matched → R&D flagged');
}
