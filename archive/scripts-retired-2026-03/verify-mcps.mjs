#!/usr/bin/env node
/**
 * Verify Global MCP Configuration for ACT Ecosystem
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`\n${BLUE}🔌 Verifying Global MCPs for ACT Ecosystem${RESET}\n`);

// Check .mcp.json exists
const mcpConfigPath = join(process.cwd(), '.mcp.json');
if (!existsSync(mcpConfigPath)) {
  console.error(`${RED}❌ .mcp.json not found${RESET}`);
  process.exit(1);
}

// Load MCP config
const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8'));
console.log(`${GREEN}✅ MCP Configuration: Found${RESET}\n`);

// Check each MCP
console.log(`${BLUE}📋 Configured MCPs${RESET}\n`);

const mcps = mcpConfig.mcpServers || {};
const mcpNames = Object.keys(mcps);

if (mcpNames.length === 0) {
  console.log(`${YELLOW}⚠️  No MCPs configured${RESET}`);
} else {
  mcpNames.forEach((name, index) => {
    const mcp = mcps[name];
    console.log(`${GREEN}${index + 1}. ${name}${RESET}`);
    if (mcp.comment) {
      console.log(`   ${mcp.comment}`);
    }
    console.log('');
  });
}

// Check environment variables
console.log(`${BLUE}🔑 Environment Variables${RESET}\n`);

const envPath = join(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.log(`${YELLOW}⚠️  .env.local not found - environment variables not checked${RESET}\n`);
} else {
  const envContent = readFileSync(envPath, 'utf8');

  const requiredVars = [
    'GITHUB_TOKEN',
    'SUPABASE_CONNECTION_STRING',
    'NOTION_TOKEN'
  ];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    if (regex.test(envContent)) {
      console.log(`${GREEN}✅ ${varName}: Set${RESET}`);
    } else {
      console.log(`${RED}❌ ${varName}: Missing${RESET}`);
    }
  });
}

// Check project paths
console.log(`\n${BLUE}📂 Project Paths${RESET}\n`);

const projects = [
  { path: '/Users/benknight/act-global-infrastructure', name: 'Global Infrastructure' },
  { path: '/Users/benknight/Code/empathy-ledger-v2', name: 'Empathy Ledger v2' },
  { path: '/Users/benknight/Code/JusticeHub', name: 'JusticeHub' },
  { path: '/Users/benknight/Code/The Harvest Website', name: 'The Harvest Website' },
  { path: '/Users/benknight/Code/Goods Asset Register', name: 'Goods Asset Register' },
  { path: '/Users/benknight/Code/ACT Farm/act-farm', name: 'ACT Farm (BCV)' },
  { path: '/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio', name: 'ACT Studio' },
  { path: '/Users/benknight/Code/ACT Placemat', name: 'ACT Placemat' }
];

projects.forEach(project => {
  if (existsSync(project.path)) {
    console.log(`${GREEN}✅ ${project.name}${RESET}`);
  } else {
    console.log(`${YELLOW}⚠️  ${project.name}: Not found${RESET}`);
  }
});

// Next steps
console.log(`\n${BLUE}📝 Next Steps${RESET}\n`);
console.log('1. Restart Claude Code to load MCP configuration:');
console.log(`   ${YELLOW}CMD+Shift+P → "Reload Window"${RESET}`);
console.log('');
console.log('2. Test MCPs in Claude Code:');
console.log(`   ${YELLOW}Ask: "Show me backlog issues from GitHub"${RESET}`);
console.log(`   ${YELLOW}Ask: "Query sprint metrics from database"${RESET}`);
console.log(`   ${YELLOW}Ask: "List files in empathy-ledger-v2"${RESET}`);
console.log('');
console.log('3. Check MCP status:');
console.log(`   ${YELLOW}CMD+Shift+P → "MCP: Show Status"${RESET}`);

console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${GREEN}✅ MCP Verification Complete${RESET}`);
console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
