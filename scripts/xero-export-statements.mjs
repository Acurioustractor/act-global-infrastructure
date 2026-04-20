#!/usr/bin/env node
/**
 * Export bank statement lines from Xero using Playwright.
 *
 * First run: opens a visible browser for you to log in to Xero manually.
 * Saves the session so subsequent runs are headless and automatic.
 *
 * Exports ALL statement lines for a date range from the NAB Visa account,
 * then feeds them into ingest-statement-lines-raw.mjs.
 *
 * Usage:
 *   node scripts/xero-export-statements.mjs --login          # First time: visible browser, log in manually
 *   node scripts/xero-export-statements.mjs                   # Headless: export + ingest current quarter
 *   node scripts/xero-export-statements.mjs --from 2025-10-01 --to 2025-12-31
 *   node scripts/xero-export-statements.mjs --quarter Q3      # Jan-Mar 2026
 */
import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const XERO_BANK_URL = 'https://go.xero.com/Bank/BankAccount.aspx?accountID=5955b56e-cbce-42f2-a4b4-76412b15a0f5';
const STATE_DIR = path.join(process.cwd(), '.playwright-state');
const STATE_FILE = path.join(STATE_DIR, 'xero-session.json');

const args = process.argv.slice(2);
const LOGIN_MODE = args.includes('--login');
const quarterArg = args.find((a, i) => args[i - 1] === '--quarter') || null;

function getQuarterDates(q) {
  const now = new Date();
  const fy = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  return {
    Q1: [`${fy - 1}-07-01`, `${fy - 1}-09-30`],
    Q2: [`${fy - 1}-10-01`, `${fy - 1}-12-31`],
    Q3: [`${fy}-01-01`, `${fy}-03-31`],
    Q4: [`${fy}-04-01`, `${fy}-06-30`],
  }[q];
}

let fromDate = args.find((a, i) => args[i - 1] === '--from') || null;
let toDate = args.find((a, i) => args[i - 1] === '--to') || null;

if (quarterArg) {
  const dates = getQuarterDates(quarterArg);
  if (dates) [fromDate, toDate] = dates;
}

if (!fromDate || !toDate) {
  // Default: current quarter
  const now = new Date();
  const month = now.getMonth();
  const fy = month >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  if (month >= 9 && month <= 11) [fromDate, toDate] = [`${fy - 1}-10-01`, `${fy - 1}-12-31`];
  else if (month >= 0 && month <= 2) [fromDate, toDate] = [`${fy}-01-01`, `${fy}-03-31`];
  else if (month >= 3 && month <= 5) [fromDate, toDate] = [`${fy}-04-01`, `${fy}-06-30`];
  else [fromDate, toDate] = [`${fy - 1}-07-01`, `${fy - 1}-09-30`];
}

console.log(`Xero Statement Export — ${fromDate} to ${toDate}`);

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

async function main() {
  const hasSession = existsSync(STATE_FILE);

  if (LOGIN_MODE || !hasSession) {
    console.log('\n🔐 Login mode — opening visible browser. Log into Xero manually.\n');
    console.log('Once logged in and you can see the bank account page, press Enter in this terminal.\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://login.xero.com/');
    console.log('Waiting for you to log in...');
    console.log('Navigate to: Banking → NAB Visa ACT #8815');

    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // Save session state
    await context.storageState({ path: STATE_FILE });
    console.log('✅ Session saved to', STATE_FILE);

    if (!LOGIN_MODE) {
      // Continue with export
      await exportStatements(context, page);
    }

    await browser.close();
    return;
  }

  // Headless mode with saved session
  console.log('Using saved session from', STATE_FILE);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  try {
    await exportStatements(context, page);
  } catch (e) {
    console.error('Export failed:', e.message);
    console.log('\nSession may have expired. Run with --login to re-authenticate.');
  }

  await browser.close();
}

async function exportStatements(context, page) {
  console.log('\nNavigating to NAB Visa account...');

  // Go to the bank account page
  await page.goto(XERO_BANK_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Check if we're logged in
  const url = page.url();
  if (url.includes('login.xero.com')) {
    throw new Error('Not logged in — session expired');
  }

  console.log('On bank account page. Looking for statement lines...');

  // Click "Statement Lines" tab if it exists
  try {
    await page.click('text=Statement Lines', { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch {
    console.log('Statement Lines tab not found, trying Account Transactions...');
    try {
      await page.click('text=Account Transactions', { timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch {
      console.log('Navigating directly to account transactions...');
    }
  }

  // Set date range
  // Xero uses dd/mm/yyyy format
  const fromParts = fromDate.split('-');
  const toParts = toDate.split('-');
  const fromFormatted = `${fromParts[2]}/${fromParts[1]}/${fromParts[0]}`;
  const toFormatted = `${toParts[2]}/${toParts[1]}/${toParts[0]}`;

  console.log(`Setting date range: ${fromFormatted} to ${toFormatted}`);

  // Try to find and fill date inputs
  try {
    const dateFromInput = page.locator('input[name*="from"], input[id*="from"], input[placeholder*="From"]').first();
    const dateToInput = page.locator('input[name*="to"], input[id*="to"], input[placeholder*="To"]').first();

    if (await dateFromInput.isVisible()) {
      await dateFromInput.fill(fromFormatted);
      await dateToInput.fill(toFormatted);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
  } catch {
    console.log('Could not set date range automatically — may need manual adjustment');
  }

  // Select all statement lines
  try {
    const selectAll = page.locator('input[type="checkbox"]').first();
    if (await selectAll.isVisible()) {
      await selectAll.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    console.log('Could not select all — will try to scrape visible lines');
  }

  // Scrape the table content
  console.log('Scraping statement lines...');

  // Try to get all visible table rows
  const rows = await page.evaluate(() => {
    const lines = [];
    // Try multiple table selectors
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const trs = table.querySelectorAll('tr');
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td'));
        if (cells.length >= 5) {
          const text = cells.map(c => c.textContent.trim()).join('\t');
          if (text.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/)) {
            lines.push(text);
          }
        }
      }
    }
    return lines;
  });

  if (rows.length === 0) {
    // Fallback: try to get the page content and look for statement line patterns
    console.log('Table scraping returned 0 rows. Taking screenshot for debugging...');
    const screenshotPath = path.join(STATE_DIR, 'xero-debug.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to', screenshotPath);

    // Try getting inner text of the main content area
    const pageText = await page.innerText('body');
    const textLines = pageText.split('\n')
      .filter(l => l.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/));

    if (textLines.length > 0) {
      console.log(`Found ${textLines.length} lines via text extraction`);
      saveAndIngest(textLines);
    } else {
      console.log('Could not extract statement lines automatically.');
      console.log('The page structure may have changed. Check the screenshot.');
      console.log('\nFallback: copy statement lines manually from Xero UI and save to a file,');
      console.log('then run: node scripts/ingest-statement-lines-raw.mjs <file>');
    }
    return;
  }

  console.log(`Extracted ${rows.length} statement lines`);
  saveAndIngest(rows);
}

function saveAndIngest(lines) {
  const outputFile = path.join('data', `statement-lines-export-${fromDate}-to-${toDate}.txt`);

  if (!existsSync('data')) mkdirSync('data');
  writeFileSync(outputFile, lines.join('\n'), 'utf8');
  console.log(`Saved to ${outputFile}`);

  // Run ingestion
  console.log('\nIngesting into Supabase...');
  try {
    const result = execSync(`node scripts/ingest-statement-lines-raw.mjs ${outputFile}`, {
      encoding: 'utf8',
      timeout: 60000,
    });
    console.log(result);
  } catch (e) {
    console.error('Ingestion failed:', e.message);
    console.log(`File saved at ${outputFile} — you can run ingestion manually.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
