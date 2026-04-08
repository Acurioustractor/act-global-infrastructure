#!/usr/bin/env node
/**
 * Prepare Portal Manifest — converts a vendor portal CSV export (Qantas
 * Business Rewards, Uber Business, Stripe, Xero Subscription, etc.) into a
 * normalized manifest.csv that bulk-upload-receipts.mjs can consume.
 *
 * The bulk-upload script expects a manifest with columns:
 *   filename,vendor,date,amount
 *
 * This script auto-detects the portal format from the CSV headers and maps
 * the fields accordingly. Supported today:
 *   - Qantas Business Rewards
 *   - Uber Business (Trip Activity)
 *   - Stripe (Invoices export)
 *   - Generic (fallback for any CSV with date+amount columns)
 *
 * You download the portal's CSV + matching PDFs into a folder, run this
 * script to generate manifest.csv, then run bulk-upload-receipts.mjs --manifest
 * to attach everything to Xero.
 *
 * Usage:
 *   node scripts/prepare-portal-manifest.mjs --input qantas-export.csv --vendor Qantas
 *   node scripts/prepare-portal-manifest.mjs --input uber-trips.csv --vendor Uber --out ./receipts/uber/manifest.csv
 *   node scripts/prepare-portal-manifest.mjs --input export.csv --vendor Stripe
 *
 * Workflow:
 *   1. Download PDFs from portal into ./receipts-backfill/<vendor>/
 *   2. Also download the CSV export into the same folder
 *   3. node scripts/prepare-portal-manifest.mjs --input ./receipts-backfill/qantas/qantas.csv --vendor Qantas
 *   4. node scripts/bulk-upload-receipts.mjs --folder ./receipts-backfill/qantas --manifest ./receipts-backfill/qantas/manifest.csv --apply
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, basename } from 'path';

function parseCSVLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (vals[j] || '').trim();
    rows.push(row);
  }
  return { headers, rows };
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function normalizeDate(s) {
  if (!s) return null;
  // Already ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // DD/MM/YYYY or DD-MM-YYYY (Australian format)
  const au = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (au) {
    const day = au[1].padStart(2, '0');
    const month = au[2].padStart(2, '0');
    let year = au[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  // DD-Mon-YYYY (Dext export style)
  const dMonY = s.match(/^(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{2,4})/);
  if (dMonY) {
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const month = months[dMonY[2].toLowerCase()] || '01';
    let year = dMonY[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${dMonY[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeAmount(s) {
  if (s == null || s === '') return null;
  const cleaned = String(s).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.abs(n);
}

// ============================================================================
// SCHEMA DETECTORS — examine headers to identify the portal
// ============================================================================

const SCHEMAS = {
  qantas: {
    name: 'Qantas Business Rewards',
    detect: (headers) => {
      const lower = headers.map(h => h.toLowerCase());
      return lower.some(h => h.includes('ticket number') || h.includes('booking reference'))
        || lower.some(h => h.includes('qantas'))
        || (lower.some(h => h.includes('fare')) && lower.some(h => h.includes('gst')));
    },
    map: (row) => {
      // Common Qantas Business Rewards columns:
      //   Ticket Number / Document Number
      //   Passenger Name
      //   Transaction Date / Invoice Date
      //   Sector / Route
      //   Total Amount / Total Amount (AUD)
      //   GST Amount (AUD)
      const date = normalizeDate(row['Transaction Date'] || row['Invoice Date'] || row['Travel Date'] || row['Date']);
      const amount = normalizeAmount(row['Total Amount (AUD)'] || row['Total Amount'] || row['Total'] || row['Gross Amount']);
      const docNum = row['Ticket Number'] || row['Document Number'] || row['Invoice Number'] || row['Booking Reference'] || '';
      // Guess filename convention: docNum.pdf, or Ticket_docNum.pdf
      const filename = docNum ? `${docNum}.pdf` : null;
      const notes = [row['Passenger Name'], row['Sector'] || row['Route'], row['Class']].filter(Boolean).join(' — ');
      return { filename, date, amount, notes };
    },
  },

  uber: {
    name: 'Uber Business (Trip Activity)',
    detect: (headers) => {
      const lower = headers.map(h => h.toLowerCase());
      return lower.some(h => h.includes('trip') || h.includes('request time'))
        && lower.some(h => h.includes('fare') || h.includes('amount') || h.includes('total'));
    },
    map: (row) => {
      // Common Uber Business columns:
      //   Trip/Order ID
      //   Request Time (Local)
      //   Begin Trip Time (Local) / Drop Off Time (Local)
      //   City
      //   Fare (Local) / Total (Local) / Amount (AUD)
      //   Employee
      const date = normalizeDate(
        row['Begin Trip Time (Local)'] ||
        row['Drop Off Time (Local)'] ||
        row['Request Time (Local)'] ||
        row['Date']
      );
      const amount = normalizeAmount(
        row['Total (AUD)'] || row['Total Amount'] || row['Fare (Local Currency)'] || row['Fare (Local)'] || row['Total']
      );
      const tripId = row['Trip/Order ID'] || row['Trip ID'] || row['Order ID'] || '';
      const filename = tripId ? `${tripId}.pdf` : null;
      const notes = [row['City'], row['Employee'], row['Begin Trip Address']].filter(Boolean).join(' — ');
      return { filename, date, amount, notes };
    },
  },

  stripe: {
    name: 'Stripe Invoices',
    detect: (headers) => {
      const lower = headers.map(h => h.toLowerCase());
      return lower.some(h => h.includes('invoice number') || h === 'id')
        && lower.some(h => h.includes('amount') || h.includes('total'));
    },
    map: (row) => {
      const date = normalizeDate(row['Date (UTC)'] || row['Created'] || row['Date']);
      const amount = normalizeAmount(row['Total'] || row['Amount Paid'] || row['Amount']);
      const invNum = row['Number'] || row['Invoice Number'] || row['id'] || '';
      const filename = invNum ? `${invNum}.pdf` : null;
      return { filename, date, amount, notes: row['Customer Email'] || '' };
    },
  },

  generic: {
    name: 'Generic (fallback)',
    detect: () => true,
    map: (row) => {
      // Look for any column that smells like date/amount/filename
      const dateKey = Object.keys(row).find(k => /date|time/i.test(k));
      const amountKey = Object.keys(row).find(k => /total|amount|fare|price/i.test(k));
      const fileKey = Object.keys(row).find(k => /file|invoice|number|ref/i.test(k));
      return {
        filename: row[fileKey] ? `${row[fileKey]}.pdf` : null,
        date: normalizeDate(row[dateKey]),
        amount: normalizeAmount(row[amountKey]),
        notes: '',
      };
    },
  },
};

function detectSchema(headers) {
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    if (key === 'generic') continue;
    if (schema.detect(headers)) return { key, schema };
  }
  return { key: 'generic', schema: SCHEMAS.generic };
}

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outIdx = args.indexOf('--out');
  const vendorIdx = args.indexOf('--vendor');
  const schemaIdx = args.indexOf('--schema');

  const input = inputIdx !== -1 ? args[inputIdx + 1] : null;
  if (!input || !existsSync(input)) {
    console.error('Usage: node scripts/prepare-portal-manifest.mjs --input <csv> --vendor <name> [--out <manifest>] [--schema qantas|uber|stripe|generic]');
    console.error('\nSupported schemas:', Object.keys(SCHEMAS).join(', '));
    process.exit(1);
  }

  const defaultVendor = vendorIdx !== -1 ? args[vendorIdx + 1] : null;
  const out = outIdx !== -1 ? args[outIdx + 1] : join(dirname(input), 'manifest.csv');
  const forcedSchema = schemaIdx !== -1 ? args[schemaIdx + 1] : null;

  const text = readFileSync(input, 'utf8');
  const { headers, rows } = parseCSV(text);
  console.log(`Parsed ${rows.length} rows from ${basename(input)}`);
  console.log(`Columns: ${headers.join(', ')}`);

  const { key, schema } = forcedSchema
    ? { key: forcedSchema, schema: SCHEMAS[forcedSchema] || SCHEMAS.generic }
    : detectSchema(headers);
  console.log(`\nDetected schema: ${schema.name} (${key})`);
  if (!defaultVendor) console.log(`⚠ No --vendor passed — using "${key}" as fallback vendor name`);

  const mapped = rows.map(r => {
    const m = schema.map(r);
    return {
      filename: m.filename || '',
      vendor: defaultVendor || key,
      date: m.date || '',
      amount: m.amount != null ? m.amount.toFixed(2) : '',
      notes: m.notes || '',
    };
  });

  // Filter to rows with at least date + amount
  const valid = mapped.filter(r => r.date && r.amount);
  const invalid = mapped.length - valid.length;

  // Write manifest
  const header = 'filename,vendor,date,amount,notes\n';
  const body = valid.map(r => [
    csvEscape(r.filename),
    csvEscape(r.vendor),
    csvEscape(r.date),
    csvEscape(r.amount),
    csvEscape(r.notes),
  ].join(',')).join('\n');
  writeFileSync(out, header + body + '\n');

  console.log(`\n=== Results ===`);
  console.log(`  Valid rows:    ${valid.length}`);
  console.log(`  Invalid rows:  ${invalid} (missing date or amount)`);
  console.log(`  Output:        ${out}`);
  console.log(`\nPreview (first 5):`);
  for (const r of valid.slice(0, 5)) {
    console.log(`  ${r.date}  ${r.vendor.padEnd(12)} ${('$' + r.amount).padStart(10)}  ${r.filename || '(no filename)'}`);
  }

  console.log(`\nNext: node scripts/bulk-upload-receipts.mjs --folder ${dirname(input)} --manifest ${out} --apply`);
}

main().catch(e => { console.error(e); process.exit(1); });
