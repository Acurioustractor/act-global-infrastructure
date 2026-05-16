#!/bin/bash
# Wrapper that launches the official Xero MCP server in bearer-token mode.
#
# Xero rotates refresh tokens on every refresh. The ACT workspace has three
# token mirrors (.env.local, .xero-tokens.json, Supabase xero_tokens), so this
# wrapper must reconcile them before MCP starts or the server can boot with a
# stale token and return 401 for every tool call.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_FILE="$REPO_ROOT/.xero-tokens.json"

log() {
  printf 'xero-mcp-wrapper: %s\n' "$*" >&2
}

cd "$REPO_ROOT"

if [ ! -f "$REPO_ROOT/scripts/sync-xero-tokens.mjs" ]; then
  log "missing scripts/sync-xero-tokens.mjs"
  exit 1
fi

log "syncing Xero token mirrors"
node "$REPO_ROOT/scripts/sync-xero-tokens.mjs" >&2

if [ ! -f "$TOKEN_FILE" ]; then
  log "missing $TOKEN_FILE after token sync"
  exit 1
fi

ACCESS_TOKEN="$(
  node -e "
    const fs = require('fs');
    const file = process.argv[1];
    const token = JSON.parse(fs.readFileSync(file, 'utf8')).access_token;
    if (!token) process.exit(1);
    process.stdout.write(token);
  " "$TOKEN_FILE"
)"

if [ -z "$ACCESS_TOKEN" ]; then
  log "could not read access token from $TOKEN_FILE"
  exit 1
fi

export XERO_CLIENT_BEARER_TOKEN="$ACCESS_TOKEN"
unset XERO_CLIENT_ID XERO_CLIENT_SECRET XERO_REFRESH_TOKEN XERO_ACCESS_TOKEN

if [ "${XERO_MCP_WRAPPER_SMOKE:-}" = "1" ]; then
  log "token ready"
  exit 0
fi

if command -v npx >/dev/null 2>&1; then
  NPX_BIN="$(command -v npx)"
elif [ -x "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)/bin/npx" ]; then
  NPX_BIN="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | sort -V | tail -1)/bin/npx"
else
  log "npx not found"
  exit 1
fi

log "launching @xeroapi/xero-mcp-server@latest"
exec "$NPX_BIN" -y @xeroapi/xero-mcp-server@latest
