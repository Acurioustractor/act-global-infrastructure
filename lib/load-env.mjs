/**
 * Environment Variable Loader
 *
 * Loads environment variables from .env.local (preferred) or .env
 * Used by all automation scripts for consistent env handling
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Try .env.local first (for local development), then .env (for production)
const envFiles = ['.env.local', '.env'];

for (const envFile of envFiles) {
  const envPath = join(projectRoot, envFile);
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: true });
    if (!result.error) {
      console.log(`✅ Loaded environment from ${envFile}`);
      break;
    }
  }
}

// Keychain fallback: if a token is missing or known to be invalid, try macOS Keychain.
// Pattern: security add-generic-password -U -a "$USER" -s "<service>" -w "<token>"
// Storing tokens in Keychain (not files) is the durable secure pattern — survives .env loss.
const keychainServices = {
  NOTION_TOKEN: 'act-notion-token',
  TELEGRAM_BOT_TOKEN: 'act-telegram-bot-token',
  // Add more here as needed: SUPABASE_SERVICE_ROLE_KEY, XERO_CLIENT_SECRET, etc.
};

function readKeychain(service) {
  try {
    return execSync(
      `security find-generic-password -a "$USER" -s "${service}" -w 2>/dev/null`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim() || null;
  } catch {
    return null;
  }
}

for (const [envVar, service] of Object.entries(keychainServices)) {
  if (!process.env[envVar]) {
    const fromKeychain = readKeychain(service);
    if (fromKeychain) {
      process.env[envVar] = fromKeychain;
      console.log(`🔐 Loaded ${envVar} from Keychain (service: ${service})`);
    }
  }
}

// Warn about missing variables (don't exit — scripts that need them will fail at point-of-use)
const recommended = ['GITHUB_TOKEN', 'NOTION_TOKEN'];
const missing = recommended.filter(v => !process.env[v] && !process.env[`GH_PROJECT_TOKEN`]);

if (missing.length > 0 && !process.env.GH_PROJECT_TOKEN) {
  console.warn('⚠️  Missing environment variables (may be needed by some scripts):');
  missing.forEach(v => console.warn(`   - ${v}`));
}

// Normalize token names (support both GITHUB_TOKEN and GH_PROJECT_TOKEN)
if (!process.env.GITHUB_TOKEN && process.env.GH_PROJECT_TOKEN) {
  process.env.GITHUB_TOKEN = process.env.GH_PROJECT_TOKEN;
}
if (!process.env.GH_PROJECT_TOKEN && process.env.GITHUB_TOKEN) {
  process.env.GH_PROJECT_TOKEN = process.env.GITHUB_TOKEN;
}

export default process.env;
