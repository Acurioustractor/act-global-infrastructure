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
