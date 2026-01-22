# ACT Ecosystem Secrets Setup

This guide explains how to obtain and configure all API credentials for the ACT ecosystem.

## Quick Reference: Where Secrets Live

| Secret | Local Dev | GitHub Actions | Bitwarden |
|--------|-----------|----------------|-----------|
| XERO_CLIENT_ID | `.env.local` | Repository secret | "ACT Xero App" |
| XERO_CLIENT_SECRET | `.env.local` | Repository secret | "ACT Xero App" |
| XERO_TENANT_ID | `.env.local` | Repository secret | "ACT Xero App" |
| GOOGLE_SERVICE_ACCOUNT_KEY | `.env.local` | Repository secret | "ACT Google Service Account" |
| SUPABASE_SERVICE_ROLE_KEY | `.env.local` | Repository secret | "ACT Supabase" |
| DISCORD_WEBHOOK_URL | `.env.local` | Repository secret | "ACT Discord Webhooks" |

---

## 1. Xero Integration

### Get Credentials

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Click "New App" or select existing ACT app
3. Choose "OAuth 2.0" grant type
4. Note down:
   - **Client ID** → `XERO_CLIENT_ID`
   - **Client Secret** → `XERO_CLIENT_SECRET`

### Get Tenant ID

1. After OAuth flow, the tenant ID is returned
2. Or find it in Xero organization settings
3. This is your organization's unique identifier

### Add to `.env.local`

```bash
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_TENANT_ID=your_tenant_id_here
```

### Store in Bitwarden

```bash
bw unlock
export BW_SESSION=$(bw unlock --raw)

# Create or update Xero entry
bw create item '{
  "type": 1,
  "name": "ACT Xero App",
  "login": {
    "username": "XERO_CLIENT_ID",
    "password": "your_client_id"
  },
  "fields": [
    {"name": "XERO_CLIENT_SECRET", "value": "your_secret", "type": 1},
    {"name": "XERO_TENANT_ID", "value": "your_tenant_id", "type": 0}
  ],
  "notes": "Xero OAuth2 app for ACT financial sync"
}'
```

---

## 2. Google Service Account (Gmail/Calendar Sync)

### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create project "ACT Ecosystem"
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
   - Name: `act-sync-service`
   - Description: `ACT Gmail and Calendar sync`
5. Click **Create and Continue**
6. Skip role assignment (not needed for Gmail API)
7. Click **Done**

### Generate Key

1. Click on the new service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Download the file (e.g., `act-sync-service-key.json`)

### Enable Domain-Wide Delegation (for Gmail)

1. On service account page, click **Edit**
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Save
4. Note the **Client ID** (numeric)

### Configure Workspace Admin (if using Gmail API)

1. Go to [Google Workspace Admin](https://admin.google.com)
2. **Security** > **API Controls** > **Domain-wide Delegation**
3. Click **Add new**
4. Enter:
   - Client ID: (from service account)
   - Scopes: `https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/calendar.readonly`

### Base64 Encode the Key

```bash
# Encode the JSON key file
cat act-sync-service-key.json | base64 | tr -d '\n' > encoded-key.txt

# Copy to clipboard (macOS)
cat encoded-key.txt | pbcopy
```

### Add to `.env.local`

```bash
GOOGLE_SERVICE_ACCOUNT_KEY=eyJhbGciOiJSUzI1NiIsInR5cCI6....(very long base64 string)
```

### Store in Bitwarden

```bash
bw create item '{
  "type": 2,
  "name": "ACT Google Service Account",
  "secureNote": {
    "type": 0
  },
  "notes": "Base64-encoded service account JSON key for ACT Gmail/Calendar sync",
  "fields": [
    {"name": "GOOGLE_SERVICE_ACCOUNT_KEY", "value": "your_base64_key", "type": 1},
    {"name": "SERVICE_ACCOUNT_EMAIL", "value": "act-sync@project.iam.gserviceaccount.com", "type": 0}
  ]
}'
```

---

## 3. GitHub Repository Secrets

Add these to your repo: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**

### Required Secrets

| Secret Name | Value Source |
|-------------|--------------|
| `SUPABASE_URL` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase dashboard |
| `XERO_CLIENT_ID` | From Xero developer portal |
| `XERO_CLIENT_SECRET` | From Xero developer portal |
| `XERO_TENANT_ID` | From Xero organization |
| `XERO_REFRESH_TOKEN` | After initial OAuth flow |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Base64-encoded JSON key |
| `DISCORD_WEBHOOK_URL` | From Discord server settings |

### Quick Setup Script

```bash
# Set GitHub secrets from .env.local (requires gh CLI)
gh secret set SUPABASE_URL --body "$NEXT_PUBLIC_SUPABASE_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set XERO_CLIENT_ID --body "$XERO_CLIENT_ID"
gh secret set XERO_CLIENT_SECRET --body "$XERO_CLIENT_SECRET"
gh secret set XERO_TENANT_ID --body "$XERO_TENANT_ID"
gh secret set GOOGLE_SERVICE_ACCOUNT_KEY --body "$GOOGLE_SERVICE_ACCOUNT_KEY"
gh secret set DISCORD_WEBHOOK_URL --body "$DISCORD_WEBHOOK_URL"
```

---

## 4. Discord Webhooks

### Create Webhook

1. Go to Discord server
2. **Server Settings** > **Integrations** > **Webhooks**
3. Click **New Webhook**
4. Name it (e.g., "ACT Notifications")
5. Select channel (e.g., #notifications)
6. Copy **Webhook URL**

### Add to `.env.local`

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefg
DISCORD_ALERTS_WEBHOOK=https://discord.com/api/webhooks/987654321/hijklmn
```

---

## 5. Verify Setup

Run this script to verify all credentials are configured:

```bash
#!/bin/bash
# verify-secrets.sh

echo "=== Checking Environment Variables ==="

check_var() {
  if [ -z "${!1}" ]; then
    echo "❌ $1 - NOT SET"
  else
    echo "✅ $1 - configured (${#1} chars)"
  fi
}

# Load .env.local
source .env.local

echo ""
echo "=== Core Services ==="
check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "SUPABASE_SERVICE_ROLE_KEY"
check_var "OPENAI_API_KEY"

echo ""
echo "=== Xero ==="
check_var "XERO_CLIENT_ID"
check_var "XERO_CLIENT_SECRET"
check_var "XERO_TENANT_ID"

echo ""
echo "=== Google ==="
check_var "GOOGLE_SERVICE_ACCOUNT_KEY"

echo ""
echo "=== Discord ==="
check_var "DISCORD_WEBHOOK_URL"

echo ""
echo "=== GHL ==="
check_var "GHL_API_KEY"
check_var "GHL_LOCATION_ID"

echo ""
echo "=== Notion ==="
check_var "NOTION_TOKEN"
```

---

## Security Notes

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Rotate secrets regularly** - Especially after team changes
3. **Use Bitwarden** - Single source of truth for all secrets
4. **Limit GitHub secret access** - Only workflows that need them
5. **Review audit logs** - Check for unauthorized access

## Troubleshooting

### "Invalid credentials" errors

1. Check for trailing whitespace in values
2. Ensure base64 encoding is single-line (no newlines)
3. Verify token hasn't expired

### "Permission denied" errors

1. Check API is enabled in Google Cloud Console
2. Verify domain-wide delegation is configured
3. Ensure scopes match what's configured in admin console

### Xero token refresh failures

1. Re-run OAuth flow to get new refresh token
2. Check app hasn't been disconnected in Xero
3. Verify client credentials are correct
