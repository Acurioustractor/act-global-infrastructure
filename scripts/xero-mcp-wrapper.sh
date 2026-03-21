#!/bin/bash
# Wrapper that refreshes a Xero access token, then launches the MCP server
# with XERO_CLIENT_BEARER_TOKEN so it uses bearer-token mode.

set -euo pipefail

# Source env vars (Client ID, Secret, Refresh Token)
ENV_FILE="$(dirname "$0")/../.env.local"
if [ -f "$ENV_FILE" ]; then
  export $(grep -E '^XERO_' "$ENV_FILE" | xargs)
fi

# Refresh the access token
TOKEN_RESPONSE=$(curl -s -X POST https://identity.xero.com/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=${XERO_CLIENT_ID}&client_secret=${XERO_CLIENT_SECRET}&refresh_token=${XERO_REFRESH_TOKEN}")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
NEW_REFRESH=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh_token'])")

# Persist the rotated refresh token back to .env.local
if [ -n "$NEW_REFRESH" ] && [ "$NEW_REFRESH" != "null" ]; then
  sed -i '' "s|^XERO_REFRESH_TOKEN=.*|XERO_REFRESH_TOKEN=${NEW_REFRESH}|" "$ENV_FILE"
fi

# Launch the MCP server in bearer-token mode
export XERO_CLIENT_BEARER_TOKEN="$ACCESS_TOKEN"
unset XERO_CLIENT_ID XERO_CLIENT_SECRET XERO_REFRESH_TOKEN
exec npx -y @xeroapi/xero-mcp-server@latest
