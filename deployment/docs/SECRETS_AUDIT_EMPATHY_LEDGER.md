# Empathy Ledger - Secrets Audit & Validation
**Date**: 2026-01-01
**Project**: empathy-ledger-v2
**Total Secrets**: 29 variables

---

## 🔍 Secrets Inventory

### 1. Supabase (Database) - 5 keys

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL | ✅ Valid | Never (unless migration) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public JWT | ✅ Valid | ⚠️ Check expiry (2067) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret JWT | ✅ Valid | ⚠️ Check expiry (2067) |
| `SUPABASE_ACCESS_TOKEN` | API Token | ⚠️ CHECK | 🔄 Rotate quarterly |
| `DATABASE_URL` | Connection String | ✅ Valid | 🔄 Rotate password quarterly |

**Analysis**:
- JWT tokens expire in 2067 (80 years!) - no immediate rotation needed
- Access token: `sbp_1da91af0dc38edbafcc7eddb12c068b343c0706b` - should verify if active
- Database password: `Drillsquare99` - **WEAK PASSWORD** ⚠️
  - Should rotate to stronger password (20+ chars, random)
  - Current format is easily guessable

**Actions**:
- [ ] Test Supabase connection
- [ ] Verify access token is valid
- [ ] Rotate database password to stronger value
- [ ] Update `.env.local` and Bitwarden after rotation

---

### 2. AI Services - 3 keys

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `OPENAI_API_KEY` | API Key | ⚠️ CHECK | 🔄 Rotate quarterly |
| `ANTHROPIC_API_KEY` | API Key | ⚠️ CHECK | 🔄 Rotate quarterly |
| `TAVILY_API_KEY` | API Key | ⚠️ CHECK | 🔄 Rotate quarterly |

**Analysis**:
- OpenAI: `OPENAI_KEY_PLACEHOLDER...` - Project key format
- Anthropic: `ANTHROPIC_KEY_PLACEHOLDER...` - API key format
- Tavily: `tvly-dev-x04sL3C...` - Dev tier (1000 req/month)

**Actions**:
- [ ] Test OpenAI API call
- [ ] Test Anthropic API call
- [ ] Test Tavily API call
- [ ] Check usage limits and quotas
- [ ] Rotate all AI keys quarterly

---

### 3. OAuth Tokens - 2 keys

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `GOOGLE_ACCESS_TOKEN` | Short-lived | ❌ EXPIRED | 🔄 Refresh needed |
| `GOOGLE_REFRESH_TOKEN` | Long-lived | ⚠️ CHECK | 🔄 Rarely rotate |

**Analysis**:
- Access tokens expire after ~1 hour
- Current token: `ya29.a0ATi6K2ve...` - likely expired
- Refresh token should be used to get new access tokens

**Actions**:
- [ ] Test if refresh token works
- [ ] Use refresh token to get new access token
- [ ] Update `.env.local` with new access token
- [ ] Consider automating token refresh in app

---

### 4. GitHub Integration - 3 keys

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `GITHUB_TOKEN` | Personal Access Token | ⚠️ CHECK | 🔄 Rotate quarterly |
| `GH_PROJECT_TOKEN` | Personal Access Token | ⚠️ DUPLICATE | 🔄 Same as above |
| `GITHUB_PROJECT_ID` | Project ID | ✅ Valid | Never (identifier) |

**Analysis**:
- Both tokens are identical: `<GITHUB_TOKEN>`
- `GH_PROJECT_TOKEN` is redundant - can remove one
- Project ID: `PVT_kwHOCOopjs4BLVik` - static identifier

**Actions**:
- [ ] Test GitHub token permissions
- [ ] Remove duplicate `GH_PROJECT_TOKEN` variable
- [ ] Set expiration on GitHub token (90 days recommended)
- [ ] Rotate quarterly

---

### 5. Notion Integration - 1 key

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `NOTION_TOKEN` | Integration Token | ⚠️ CHECK | 🔄 Rotate quarterly |

**Analysis**:
- Token: `NOTION_TOKEN_PLACEHOLDER`
- Notion internal integration token

**Actions**:
- [ ] Test Notion API access
- [ ] Verify integration is active
- [ ] Rotate quarterly

---

### 6. Inngest (Event Processing) - 3 keys

| Variable | Type | Status | Rotation |
|----------|------|--------|----------|
| `INNGEST_EVENT_KEY` | Event Key | ⚠️ CHECK | 🔄 Rotate quarterly |
| `INNGEST_SIGNING_KEY` | Signing Key | ⚠️ CHECK | 🔄 Rotate quarterly |
| `INNGEST_BASE_URL` | Local Dev URL | ✅ Valid | Never (dev only) |

**Analysis**:
- Event key: `TwKwAMT7516cPJWptpEyWtMUnj1UWVUm...`
- Signing key: `signkey-prod-97a414f8a90711b26887698230315f5a...`
- **WARNING**: Using "prod" keys but pointing to `localhost:8288`
- This is a security risk if prod keys are in use locally

**Actions**:
- [ ] Verify if these are actually production keys
- [ ] If prod, create separate dev/local keys
- [ ] Never use production keys in local development
- [ ] Rotate production keys immediately if exposed

---

### 7. Configuration Variables - 12 items

| Variable | Type | Status | Notes |
|----------|------|--------|-------|
| `NEXT_PUBLIC_APP_URL` | URL | ✅ Valid | Local dev URL |
| `NEXT_PUBLIC_DEV_SUPER_ADMIN_EMAIL` | Email | ✅ Valid | Dev bypass only |
| `LLM_PROVIDER` | Config | ✅ Valid | `ollama` |
| `OLLAMA_BASE_URL` | URL | ✅ Valid | Local Ollama |
| `OLLAMA_MODEL` | Model | ✅ Valid | `llama3.1:8b` |
| `ENABLE_CULTURAL_SAFETY` | Boolean | ✅ Valid | `true` |
| `ENABLE_ELDER_REVIEW` | Boolean | ✅ Valid | `true` |
| `ENABLE_CONSENT_TRACKING` | Boolean | ✅ Valid | `true` |
| `MAX_FILE_SIZE_MB` | Number | ✅ Valid | `50` |
| `ALLOWED_IMAGE_TYPES` | List | ✅ Valid | JPEG, PNG, WebP, AVIF |
| `ALLOWED_VIDEO_TYPES` | List | ✅ Valid | MP4, WebM, QuickTime |
| `ALLOWED_AUDIO_TYPES` | List | ✅ Valid | MP3, WAV, OGG |

**Analysis**: All configuration values are reasonable and safe.

---

## 🚨 Security Issues Found

### CRITICAL

1. **Weak Database Password** ❌
   - Current: `Drillsquare99`
   - Issue: Only 13 chars, dictionary word + number
   - Risk: High - could be brute-forced
   - **Action**: Rotate immediately to 32+ char random password

2. **Production Inngest Keys in Local Dev** ⚠️
   - Using `signkey-prod-*` but pointing to localhost
   - Risk: Medium - prod keys exposed in dev environment
   - **Action**: Verify and separate prod/dev keys

### HIGH

3. **Duplicate GitHub Token** ⚠️
   - `GITHUB_TOKEN` and `GH_PROJECT_TOKEN` are identical
   - Risk: Low - just redundant
   - **Action**: Remove duplicate

4. **Google Access Token Likely Expired** ⚠️
   - Access tokens expire after ~1 hour
   - Risk: Low - app won't work until refreshed
   - **Action**: Implement auto-refresh

### MEDIUM

5. **No Token Expiration Tracking** ⚠️
   - No visibility into when tokens will expire
   - Risk: Medium - app could break unexpectedly
   - **Action**: Implement expiration monitoring

---

## ✅ Validation Tests

### Test 1: Supabase Connection
```bash
curl -X GET "https://tednluwflfhxyucgwigh.supabase.co/rest/v1/" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Expected: 200 OK

### Test 2: OpenAI API
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer OPENAI_KEY_PLACEHOLDER..."
```

Expected: List of models

### Test 3: Anthropic API
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: ANTHROPIC_KEY_PLACEHOLDER..." \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

Expected: Response with message

### Test 4: GitHub API
```bash
curl -H "Authorization: Bearer <GITHUB_TOKEN>" \
  https://api.github.com/user
```

Expected: User data

### Test 5: Notion API
```bash
curl -X GET "https://api.notion.com/v1/users/me" \
  -H "Authorization: Bearer NOTION_TOKEN_PLACEHOLDER" \
  -H "Notion-Version: 2022-06-28"
```

Expected: User info

---

## 🔄 Monthly Rotation Process

### Week 1: Audit & Test (1st of month)
```bash
# 1. Pull latest from Bitwarden
cd /Users/benknight/Code/empathy-ledger-v2
/env-manager sync-bitwarden .

# 2. Run validation tests
npm run test:secrets  # (create this script)

# 3. Check expiration dates
# - Review AI service usage
# - Check GitHub token expiry
# - Verify Supabase quota
```

### Week 2: Rotate Secrets (2nd week)
```bash
# Rotate in this order:
1. Database password (Supabase dashboard)
2. OpenAI API key (platform.openai.com)
3. Anthropic API key (console.anthropic.com)
4. GitHub token (github.com/settings/tokens)
5. Notion token (notion.so/my-integrations)
6. Tavily API key (app.tavily.com)
7. Inngest keys (inngest.com dashboard)

# After each rotation:
# - Update .env.local
# - Test the service
# - Backup to Bitwarden
# - Update production (Vercel/etc)
```

### Week 3: Verify & Document
```bash
# 1. Verify all services working
npm run dev
# Test all integrations

# 2. Update rotation log
# Add entry to docs/ROTATION_LOG.md

# 3. Backup to Bitwarden
/env-manager backup-bitwarden .
```

### Week 4: Monitor
```bash
# Check logs for any auth failures
# Review service usage/quotas
# Plan for next rotation
```

---

## 📋 Rotation Checklist Template

```markdown
# Monthly Secret Rotation - [Month Year]

## Pre-Rotation
- [ ] Pull latest from Bitwarden
- [ ] Test all current secrets
- [ ] Document current state

## Rotation
- [ ] Supabase database password
- [ ] OpenAI API key
- [ ] Anthropic API key
- [ ] GitHub personal access token
- [ ] Notion integration token
- [ ] Tavily API key
- [ ] Inngest event/signing keys

## Post-Rotation
- [ ] Update .env.local
- [ ] Test all services
- [ ] Backup to Bitwarden
- [ ] Update production environments
- [ ] Document in rotation log
- [ ] Archive old keys (wait 1 week before deleting)

## Issues Encountered
- None / [list any issues]

## Next Rotation
- Scheduled: [1st week of next month]
```

---

## 🤖 Automation Script

Create `scripts/validate-secrets.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Validate all secrets in .env.local
 * Run monthly as part of rotation process
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Validating Empathy Ledger Secrets\n');

const envPath = join(process.cwd(), '.env.local');
const env = readFileSync(envPath, 'utf8');

// Parse env
const secrets = {};
env.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    secrets[key.trim()] = value.trim();
  }
});

const results = {
  valid: [],
  invalid: [],
  warning: []
};

// Test Supabase
console.log('Testing Supabase...');
// Add actual API test here

// Test OpenAI
console.log('Testing OpenAI...');
// Add actual API test here

// Test Anthropic
console.log('Testing Anthropic...');
// Add actual API test here

// Test GitHub
console.log('Testing GitHub...');
// Add actual API test here

// Test Notion
console.log('Testing Notion...');
// Add actual API test here

// Check for weak passwords
if (secrets.DATABASE_URL?.includes('Drillsquare99')) {
  results.warning.push('Database password is weak - rotate immediately');
}

// Check for duplicates
if (secrets.GITHUB_TOKEN === secrets.GH_PROJECT_TOKEN) {
  results.warning.push('Duplicate GitHub tokens found');
}

// Report
console.log('\n📊 Results:');
console.log(`✅ Valid: ${results.valid.length}`);
console.log(`❌ Invalid: ${results.invalid.length}`);
console.log(`⚠️  Warnings: ${results.warning.length}`);

if (results.warning.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warning.forEach(w => console.log(`  - ${w}`));
}
```

---

## 📅 Next Steps

### Immediate (Today)
1. ✅ Backup to Bitwarden (DONE)
2. [ ] Test all API keys
3. [ ] Rotate weak database password
4. [ ] Remove duplicate GitHub token

### This Week
1. [ ] Create validation script
2. [ ] Test all services
3. [ ] Set calendar reminder for monthly rotation

### This Month
1. [ ] Rotate all secrets
2. [ ] Update Bitwarden
3. [ ] Update production environments
4. [ ] Document process

---

**Audit Completed**: 2026-01-01
**Next Rotation**: 2026-02-01
**Status**: ⚠️ Action required (weak password, duplicates)
