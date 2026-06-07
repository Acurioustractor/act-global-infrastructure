#!/usr/bin/env node
/**
 * Refresh the Bitwarden BW_SESSION in .mcp.json — the easy way.
 *
 *   node scripts/wire-bitwarden-session.mjs
 *
 * Runs `bw unlock` locally (prompts for your master password on the terminal),
 * captures the raw session token, and writes it into the `bitwarden` MCP entry
 * in .mcp.json. The token is never printed and never touches the chat.
 * Re-run this whenever the vault locks and the session expires.
 *
 * Prereq: `bw login` once (you've done this). Optional: pass the org API key as
 *   BW_CLIENT_ID=organization.xxx BW_CLIENT_SECRET=yyy node scripts/wire-bitwarden-session.mjs
 * to also write those (only needed for org/Collection admin).
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(REPO, '.mcp.json')

let session = process.env.BW_SESSION?.trim()
if (session) {
  // Caller already unlocked in their own TTY (export BW_SESSION=$(bw unlock --raw)).
  // This avoids the piped-stdout prompt issue when a stale session is in the shell.
  console.log('→ Using BW_SESSION from environment.')
} else {
  try {
    // stdin inherited → master-password prompt reads the terminal;
    // stdout piped → we capture the raw token; stderr inherited → prompt is visible.
    session = execSync('bw unlock --raw', { stdio: ['inherit', 'pipe', 'inherit'] }).toString().trim()
  } catch {
    console.error('\n✗ `bw unlock` failed. Are you logged in?  Run `bw login` first, then re-run this.')
    process.exit(1)
  }
}
if (!session) {
  console.error('✗ No session returned. Try:  export BW_SESSION=$(bw unlock --raw)  then re-run this.')
  process.exit(1)
}

const j = JSON.parse(readFileSync(FILE, 'utf8'))
j.mcpServers ??= {}
j.mcpServers.bitwarden ??= { command: 'npx', args: ['-y', '@bitwarden/mcp-server'], env: {} }
j.mcpServers.bitwarden.env ??= {}
j.mcpServers.bitwarden.env.BW_SESSION = session
// Set the org API key if provided, otherwise strip any leftover placeholder so the
// MCP doesn't try (and fail) org auth with a bogus value.
if (process.env.BW_CLIENT_ID) j.mcpServers.bitwarden.env.BW_CLIENT_ID = process.env.BW_CLIENT_ID
else delete j.mcpServers.bitwarden.env.BW_CLIENT_ID
if (process.env.BW_CLIENT_SECRET) j.mcpServers.bitwarden.env.BW_CLIENT_SECRET = process.env.BW_CLIENT_SECRET
else delete j.mcpServers.bitwarden.env.BW_CLIENT_SECRET
writeFileSync(FILE, JSON.stringify(j, null, 2) + '\n')

const hasOrg = !!j.mcpServers.bitwarden.env.BW_CLIENT_ID
console.log(`\n✓ BW_SESSION written to .mcp.json${hasOrg ? ' (+ org API key)' : ''}.`)
console.log('→ Restart Claude Code to load the Bitwarden MCP.')
