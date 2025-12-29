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
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Loaded environment from ${envFile}`);
      break;
    }
  }
}

// Validate required variables
const required = ['GITHUB_TOKEN', 'NOTION_TOKEN'];
const missing = required.filter(v => !process.env[v] && !process.env[`GH_PROJECT_TOKEN`]);

if (missing.length > 0 && !process.env.GH_PROJECT_TOKEN) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(v => console.error(`   - ${v}`));
  console.error('\nMake sure you have .env.local or .env with all required variables.');
  process.exit(1);
}

// Normalize token names (support both GITHUB_TOKEN and GH_PROJECT_TOKEN)
if (!process.env.GITHUB_TOKEN && process.env.GH_PROJECT_TOKEN) {
  process.env.GITHUB_TOKEN = process.env.GH_PROJECT_TOKEN;
}
if (!process.env.GH_PROJECT_TOKEN && process.env.GITHUB_TOKEN) {
  process.env.GH_PROJECT_TOKEN = process.env.GITHUB_TOKEN;
}

export default process.env;
