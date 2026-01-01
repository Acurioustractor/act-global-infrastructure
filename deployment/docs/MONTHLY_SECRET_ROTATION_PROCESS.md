# Monthly Secret Rotation Process - ACT Ecosystem
**Purpose**: Automated, repeatable process for rotating all secrets monthly
**Frequency**: 1st week of every month
**Duration**: ~2 hours per month

---

## 🎯 Overview

**Why Monthly Rotation?**
- Limits exposure window if keys are compromised
- Industry best practice for API keys
- Required for compliance (SOC 2, ISO 27001)
- Catches inactive/unused keys

**What Gets Rotated?**
1. All AI service API keys (OpenAI, Anthropic, Tavily)
2. Database passwords (Supabase)
3. OAuth tokens (GitHub, Google, Notion)
4. Service keys (Inngest, etc.)
5. Access tokens

---

## 📅 Monthly Schedule

### Week 1 (1st-7th): Audit & Test
- **Day 1-2**: Run validation tests
- **Day 3-4**: Review usage & quotas
- **Day 5**: Plan rotations

### Week 2 (8th-14th): Rotate
- **Monday**: Rotate database passwords
- **Tuesday**: Rotate AI service keys
- **Wednesday**: Rotate OAuth tokens
- **Thursday**: Rotate service keys
- **Friday**: Update all environments

### Week 3 (15th-21st): Verify
- **Monday-Friday**: Monitor for issues
- **End of week**: Document rotation

### Week 4 (22nd-end): Monitor
- **Ongoing**: Check logs, usage, errors

---

## 🔄 Rotation Workflow

### Step 1: Pre-Rotation Checks

```bash
# 1. Sync from Bitwarden (get latest)
cd /Users/benknight/Code/empathy-ledger-v2
/env-manager sync-bitwarden .

# 2. Backup current state
cp .env.local .env.local.backup-$(date +%Y%m%d)

# 3. Test current secrets
npm run dev
# Test all features manually

# 4. Document current state
echo "Rotation started: $(date)" >> docs/ROTATION_LOG.md
```

### Step 2: Rotate Each Service

#### A. Supabase Database Password

```bash
# 1. Login to Supabase dashboard
open https://supabase.com/dashboard

# 2. Navigate to: Project → Settings → Database

# 3. Click "Reset Database Password"

# 4. Generate strong password (32+ chars)
# Recommended format: Use 1Password generator or:
openssl rand -base64 32

# 5. Update .env.local
# Find: DATABASE_URL=postgresql://postgres.xxx:OLD_PASSWORD@...
# Replace OLD_PASSWORD with new password

# 6. Test connection
npm run test:db
# or manually test database queries
```

#### B. OpenAI API Key

```bash
# 1. Login to OpenAI
open https://platform.openai.com/api-keys

# 2. Click "Create new secret key"
# Name: "Empathy Ledger - [Month Year]"

# 3. Copy new key

# 4. Update .env.local
# OPENAI_API_KEY=sk-proj-NEW_KEY_HERE

# 5. Test API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_NEW_KEY"

# 6. Revoke old key (wait 24hrs for propagation)
```

#### C. Anthropic API Key

```bash
# 1. Login to Anthropic Console
open https://console.anthropic.com/settings/keys

# 2. Click "Create Key"
# Name: "Empathy Ledger - [Month Year]"

# 3. Copy new key

# 4. Update .env.local
# ANTHROPIC_API_KEY=sk-ant-api03-NEW_KEY_HERE

# 5. Test API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_NEW_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'

# 6. Revoke old key
```

#### D. GitHub Personal Access Token

```bash
# 1. Login to GitHub
open https://github.com/settings/tokens

# 2. Click "Generate new token" → "Generate new token (classic)"

# 3. Settings:
# - Name: "Empathy Ledger - [Month Year]"
# - Expiration: 90 days (or custom)
# - Scopes: repo, project, workflow (match previous)

# 4. Copy token

# 5. Update .env.local
# GITHUB_TOKEN=ghp_NEW_TOKEN_HERE
# (Remove GH_PROJECT_TOKEN - it's duplicate)

# 6. Test API
curl -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  https://api.github.com/user

# 7. Delete old token
```

#### E. Notion Integration Token

```bash
# 1. Login to Notion
open https://www.notion.so/my-integrations

# 2. Find "Empathy Ledger" integration

# 3. Click "Show" on Internal Integration Token

# 4. If rotation needed:
# - Create new integration
# - Or regenerate token (if available)

# 5. Update .env.local
# NOTION_TOKEN=ntn_NEW_TOKEN_HERE

# 6. Test API
curl -X GET "https://api.notion.com/v1/users/me" \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Notion-Version: 2022-06-28"
```

#### F. Tavily API Key

```bash
# 1. Login to Tavily
open https://app.tavily.com/home

# 2. Navigate to API Keys

# 3. Generate new key or rotate existing

# 4. Update .env.local
# TAVILY_API_KEY=tvly-NEW_KEY_HERE

# 5. Test API
curl -X POST "https://api.tavily.com/search" \
  -H "Content-Type: application/json" \
  -d '{"api_key":"YOUR_NEW_KEY","query":"test"}'
```

#### G. Google OAuth Tokens

```bash
# 1. These require OAuth flow refresh
# 2. If app has auto-refresh: No action needed
# 3. If manual: Use refresh token to get new access token

# Refresh access token:
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"

# 4. Update .env.local with new access token
# GOOGLE_ACCESS_TOKEN=ya29.NEW_TOKEN_HERE
```

#### H. Inngest Keys

```bash
# 1. Login to Inngest
open https://app.inngest.com

# 2. Navigate to: Settings → Keys

# 3. Rotate event key and signing key

# 4. Update .env.local
# INNGEST_EVENT_KEY=NEW_EVENT_KEY
# INNGEST_SIGNING_KEY=NEW_SIGNING_KEY

# 5. Test (run inngest dev server)
npx inngest-cli dev
```

### Step 3: Update All Environments

```bash
# 1. Update .env.local (already done above)

# 2. Test locally
npm run dev
# Test all features

# 3. Backup to Bitwarden
/env-manager backup-bitwarden .

# 4. Update Production (Vercel)
# For each rotated secret:
vercel env add OPENAI_API_KEY production
# Enter new value when prompted

# Or via Vercel dashboard:
open https://vercel.com/your-project/settings/environment-variables

# 5. Redeploy
vercel --prod

# 6. Update Staging (if exists)
vercel env add OPENAI_API_KEY preview
```

### Step 4: Cleanup Old Keys

```bash
# Wait 7 days after rotation, then:

# 1. Revoke old keys from service dashboards
# - OpenAI: Delete old key
# - Anthropic: Delete old key
# - GitHub: Delete old token
# - Etc.

# 2. Delete local backup
rm .env.local.backup-*

# 3. Log completion
echo "Rotation completed: $(date)" >> docs/ROTATION_LOG.md
echo "Old keys revoked: $(date +%Y-%m-%d)" >> docs/ROTATION_LOG.md
```

---

## 🤖 Automation Scripts

### 1. Create Validation Script

**File**: `scripts/validate-all-secrets.mjs`

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';

const secrets = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  github: process.env.GITHUB_TOKEN,
  supabase: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

console.log('🔍 Validating all secrets...\n');

// Test OpenAI
try {
  execSync(`curl -s https://api.openai.com/v1/models -H "Authorization: Bearer ${secrets.openai}"`, {stdio: 'pipe'});
  console.log('✅ OpenAI: Valid');
} catch {
  console.log('❌ OpenAI: Invalid or expired');
}

// Test Anthropic
try {
  execSync(`curl -s https://api.anthropic.com/v1/messages -H "x-api-key: ${secrets.anthropic}" -H "Content-Type: application/json" -H "anthropic-version: 2023-06-01" -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'`, {stdio: 'pipe'});
  console.log('✅ Anthropic: Valid');
} catch {
  console.log('❌ Anthropic: Invalid or expired');
}

// Test GitHub
try {
  execSync(`curl -s -H "Authorization: Bearer ${secrets.github}" https://api.github.com/user`, {stdio: 'pipe'});
  console.log('✅ GitHub: Valid');
} catch {
  console.log('❌ GitHub: Invalid or expired');
}

// Test Supabase
try {
  execSync(`curl -s -H "apikey: ${secrets.supabase}" ${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {stdio: 'pipe'});
  console.log('✅ Supabase: Valid');
} catch {
  console.log('❌ Supabase: Invalid or expired');
}

console.log('\n✅ Validation complete');
```

### 2. Add to package.json

```json
{
  "scripts": {
    "validate:secrets": "node scripts/validate-all-secrets.mjs",
    "rotate:reminder": "echo '🔄 Monthly rotation due! See: deployment/docs/MONTHLY_SECRET_ROTATION_PROCESS.md'"
  }
}
```

### 3. Calendar Automation

**Create**: `.github/workflows/monthly-rotation-reminder.yml`

```yaml
name: Monthly Secret Rotation Reminder

on:
  schedule:
    # Runs at 9am on the 1st of every month
    - cron: '0 9 1 * *'

jobs:
  reminder:
    runs-on: ubuntu-latest
    steps:
      - name: Create Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔄 Monthly Secret Rotation Due - ' + new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'}),
              body: `## Monthly Secret Rotation Checklist

It's time for the monthly secret rotation! 🔐

### Week 1: Audit & Test
- [ ] Sync from Bitwarden
- [ ] Run \`npm run validate:secrets\`
- [ ] Review usage & quotas
- [ ] Check [audit report](../deployment/docs/SECRETS_AUDIT_EMPATHY_LEDGER.md)

### Week 2: Rotate
- [ ] Supabase database password
- [ ] OpenAI API key
- [ ] Anthropic API key
- [ ] GitHub personal access token
- [ ] Notion integration token
- [ ] Tavily API key
- [ ] Inngest keys
- [ ] Google OAuth tokens

### Week 3: Update & Verify
- [ ] Update .env.local
- [ ] Test locally
- [ ] Backup to Bitwarden
- [ ] Update Vercel production
- [ ] Verify all services working

### Week 4: Cleanup
- [ ] Wait 7 days
- [ ] Revoke old keys
- [ ] Delete local backups
- [ ] Document in rotation log

See full process: [MONTHLY_SECRET_ROTATION_PROCESS.md](../deployment/docs/MONTHLY_SECRET_ROTATION_PROCESS.md)

**Next Rotation**: ${new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}`,
              labels: ['security', 'monthly-rotation', 'automated']
            })
```

---

## 📊 Rotation Log Template

**File**: `docs/ROTATION_LOG.md`

```markdown
# Secret Rotation Log - Empathy Ledger

## 2026-02-01
**Rotated**:
- [x] Supabase database password
- [x] OpenAI API key
- [x] Anthropic API key
- [x] GitHub token
- [x] Notion token
- [x] Tavily API key

**Issues**: None
**Time Taken**: 1.5 hours
**Next Rotation**: 2026-03-01

---

## 2026-01-01
**Rotated**:
- [x] Initial Bitwarden setup
- [x] Documented all secrets

**Issues**: Found weak database password, duplicate GitHub tokens
**Time Taken**: 2 hours
**Next Rotation**: 2026-02-01
```

---

## ⏰ Quick Reference

### Monthly Tasks
```bash
# 1st of month: Audit
npm run validate:secrets

# 2nd week: Rotate
# Follow steps above for each service

# 3rd week: Verify
npm run dev && /env-manager backup-bitwarden .

# 4th week: Cleanup
# Revoke old keys from dashboards
```

### Emergency Rotation
```bash
# If key is compromised:
1. Immediately revoke from service dashboard
2. Generate new key
3. Update .env.local
4. Backup to Bitwarden
5. Update production
6. Test thoroughly
7. Document incident
```

---

## 📈 Success Metrics

Track these monthly:
- ✅ All secrets rotated on schedule
- ✅ Zero downtime during rotation
- ✅ All services validated post-rotation
- ✅ Bitwarden backup updated
- ✅ Production updated within 24hrs
- ✅ Old keys revoked after 7 days

---

**Process Created**: 2026-01-01
**Last Updated**: 2026-01-01
**Next Review**: 2026-04-01 (quarterly process review)
