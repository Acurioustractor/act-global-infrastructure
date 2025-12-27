# Environment & Secrets Management Skill

**Purpose**: Secure, reliable system for managing environment variables and secrets across all ACT ecosystem projects.

**Use this skill when**:
- Setting up new projects or repositories
- Rotating tokens and API keys
- Auditing secret usage and security
- Troubleshooting authentication issues
- Syncing secrets across environments

---

## Capabilities

### 1. Secret Audit & Health Check
**Command**: `/env-secrets-manager audit`

Scans all ACT projects and checks:
- ✅ Which secrets exist in each .env file
- ⚠️ Which secrets are missing (compared to template)
- 🔴 Which secrets are hardcoded in source files
- 📅 When tokens expire (for those with expiration)
- 🔄 Which GitHub repos have secrets configured

**Output**: Health report showing status of all secrets across 7 projects

### 2. Secret Rotation
**Command**: `/env-secrets-manager rotate <secret_name>`

Rotates a secret across all projects:
1. Generates new token (or prompts you to create one)
2. Updates all local .env files
3. Updates GitHub repository secrets
4. Tests connections with new token
5. Archives old token securely

**Supported secrets**:
- `NOTION_TOKEN` - Notion integration token
- `GITHUB_TOKEN` / `GH_PROJECT_TOKEN` - GitHub PAT
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key
- `OPENAI_API_KEY` - OpenAI API key
- Custom tokens

### 3. New Project Setup
**Command**: `/env-secrets-manager setup <project_path>`

Sets up .env files for a new project:
1. Creates .env.local from template
2. Copies secrets from central vault
3. Adds .env files to .gitignore
4. Validates all required secrets present
5. Tests connections

### 4. Secret Sync
**Command**: `/env-secrets-manager sync`

Syncs secrets across environments:
- Local .env.local files (for development)
- GitHub repository secrets (for Actions)
- Vercel environment variables (for deployments)
- Ensures consistency across all environments

### 5. Security Scan
**Command**: `/env-secrets-manager scan`

Scans codebase for security issues:
- 🔍 Hardcoded secrets in source files
- 🔍 Secrets in git history
- 🔍 Secrets in committed .env files
- 🔍 Weak or default tokens
- 🔍 Unused secrets (never referenced)

**Action**: Reports findings and offers to fix automatically

---

## Architecture

### Secret Storage Strategy

**Three-tier system**:

1. **Local Development** (.env.local files)
   - Stored in each project root
   - Added to .gitignore
   - Used by Next.js, Node scripts

2. **GitHub Actions** (Repository Secrets)
   - Stored in GitHub repo settings
   - Accessed via `${{ secrets.NAME }}`
   - Used by CI/CD workflows

3. **Production Deployment** (Vercel/Platform Secrets)
   - Stored in Vercel project settings
   - Injected at build/runtime
   - Used by deployed applications

### Central Vault (Optional)

**Location**: `~/act-global-infrastructure/.secrets-vault/`
- Encrypted master copy of all secrets
- Used for rotation and sync
- Never committed to git
- Backed up securely

---

## Secret Templates

### Standard .env.local Template

```bash
# ============================================
# ACT Ecosystem - Environment Variables
# ============================================
# NEVER COMMIT THIS FILE TO GIT
# Last updated: YYYY-MM-DD
# Project: [Project Name]

# ============================================
# GitHub Integration
# ============================================
GITHUB_TOKEN=GITHUB_TOKEN_REMOVED
GH_PROJECT_TOKEN=GITHUB_TOKEN_REMOVED
GITHUB_PROJECT_ID=PVT_kwHOCOopjs4BLVik

# ============================================
# Notion Integration
# ============================================
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_WORKSPACE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# Supabase (Database)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OpenAI (AI Features)
# ============================================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# Google OAuth (Gmail, Calendar)
# ============================================
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/gmail/callback

# ============================================
# GoHighLevel CRM
# ============================================
GHL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GHL_LOCATION_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# Vercel (Deployment)
# ============================================
VERCEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# Application Secrets
# ============================================
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXTAUTH_URL=http://localhost:3001

# ============================================
# Redis (Optional - for caching)
# ============================================
REDIS_URL=redis://nas.local:6379

# ============================================
# Project-Specific
# ============================================
# Add project-specific variables below
```

---

## Security Best Practices

### DO ✅

1. **Use environment variables** for all secrets
   ```javascript
   const token = process.env.NOTION_TOKEN; // ✅ Good
   ```

2. **Add .env files to .gitignore**
   ```gitignore
   .env
   .env.local
   .env*.local
   ```

3. **Use different tokens per environment**
   - Development: Personal tokens
   - Staging: Team tokens (limited scope)
   - Production: Service tokens (full scope)

4. **Rotate tokens regularly**
   - GitHub PAT: Every 90 days
   - Notion tokens: Every 6 months
   - API keys: Annually or when team members leave

5. **Use minimal scopes**
   - GitHub PAT: Only `repo`, `project`, `workflow`
   - Notion: Only specific workspace access
   - Supabase: Service role key only in backend

6. **Validate tokens on startup**
   ```javascript
   if (!process.env.NOTION_TOKEN) {
     throw new Error('NOTION_TOKEN is required');
   }
   ```

### DON'T ❌

1. **Never hardcode secrets**
   ```javascript
   const token = "ntn_123456..."; // ❌ BAD
   ```

2. **Never commit .env files**
   ```bash
   git add .env.local  # ❌ DANGER!
   ```

3. **Never log secrets**
   ```javascript
   console.log(process.env.SECRET_KEY); // ❌ Security risk
   ```

4. **Never share secrets in Slack/email**
   - Use secure password manager
   - Or encrypted channel

5. **Never use production secrets in development**
   - Risk of accidental data changes
   - Harder to trace issues

---

## Common Issues & Fixes

### Issue: "API token is invalid"

**Cause**: Token expired, revoked, or wrong token type

**Fix**:
```bash
# 1. Check token is set
echo $NOTION_TOKEN

# 2. Test token directly
curl -H "Authorization: Bearer $NOTION_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/users/me

# 3. If invalid, rotate token
/env-secrets-manager rotate NOTION_TOKEN
```

### Issue: "Secret not found in GitHub Actions"

**Cause**: Secret not added to repository secrets

**Fix**:
```bash
# Add secret to repo
gh secret set NOTION_TOKEN < .env.local

# Or use the skill
/env-secrets-manager sync
```

### Issue: "Secrets out of sync across repos"

**Cause**: Secrets updated in one place but not others

**Fix**:
```bash
# Sync all secrets across all repos
/env-secrets-manager sync --all

# Or audit to see differences
/env-secrets-manager audit
```

### Issue: "Hardcoded secret detected by GitHub"

**Cause**: Secret committed to git history

**Fix**:
```bash
# Scan for hardcoded secrets
/env-secrets-manager scan

# Remove from history (USE WITH CAUTION)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team first!)
git push origin --force --all
```

---

## Command Reference

### Audit Commands

```bash
# Check all secrets across all projects
/env-secrets-manager audit

# Check specific project
/env-secrets-manager audit --project empathy-ledger

# Check specific secret
/env-secrets-manager audit --secret NOTION_TOKEN

# Output to file
/env-secrets-manager audit --output secrets-report.md
```

### Rotation Commands

```bash
# Rotate Notion token
/env-secrets-manager rotate NOTION_TOKEN

# Rotate with prompt to create new token
/env-secrets-manager rotate GITHUB_TOKEN --interactive

# Rotate all expiring tokens
/env-secrets-manager rotate --expiring

# Dry run (show what would change)
/env-secrets-manager rotate NOTION_TOKEN --dry-run
```

### Setup Commands

```bash
# Setup new project
/env-secrets-manager setup /path/to/new-project

# Setup with custom template
/env-secrets-manager setup /path/to/project --template custom.env

# Copy secrets from another project
/env-secrets-manager setup /path/to/new --copy-from empathy-ledger
```

### Sync Commands

```bash
# Sync all environments (local + GitHub + Vercel)
/env-secrets-manager sync

# Sync only GitHub secrets
/env-secrets-manager sync --github-only

# Sync specific project
/env-secrets-manager sync --project justicehub

# Force sync (overwrite all)
/env-secrets-manager sync --force
```

### Scan Commands

```bash
# Scan for security issues
/env-secrets-manager scan

# Scan specific directory
/env-secrets-manager scan --path ./src

# Scan git history
/env-secrets-manager scan --history

# Auto-fix issues
/env-secrets-manager scan --fix
```

---

## Integration with ACT Projects

### All 7 ACT Projects

This skill manages secrets for:

1. **ACT Farm Studio** - `/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/`
2. **Empathy Ledger** - `/Users/benknight/Code/empathy-ledger-v2`
3. **JusticeHub** - `/Users/benknight/Code/JusticeHub/`
4. **The Harvest** - `/Users/benknight/Code/The Harvest Website/`
5. **Goods** - `/Users/benknight/Code/Goods Asset Register/`
6. **ACT Farm** - `/Users/benknight/Code/ACT Farm/act-farm/`
7. **Global Infrastructure** - `/Users/benknight/act-global-infrastructure`

### Shared Secrets

Secrets shared across all projects:
- `GITHUB_TOKEN` / `GH_PROJECT_TOKEN`
- `NOTION_TOKEN`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`

Project-specific secrets:
- `NOTION_DATABASE_ID` (different per project)
- `VERCEL_PROJECT_ID` (different per project)
- `GHL_LOCATION_ID` (different per community)

---

## Automation Scripts

### Daily Health Check (Recommended)

Add to cron or GitHub Actions:

```bash
#!/bin/bash
# Daily secret health check

cd ~/act-global-infrastructure

# Run audit
/env-secrets-manager audit --output /tmp/secrets-audit.md

# If issues found, notify
if grep -q "🔴" /tmp/secrets-audit.md; then
  echo "⚠️  Secret issues detected! Check /tmp/secrets-audit.md"
  # Send notification (Slack, email, etc.)
fi
```

### Weekly Rotation Reminder

```bash
#!/bin/bash
# Check for tokens expiring in next 30 days

/env-secrets-manager audit --expiring-soon

# If found, prompt for rotation
/env-secrets-manager rotate --expiring --interactive
```

---

## Emergency Procedures

### If Token is Compromised

1. **Immediately revoke** the token at source (GitHub, Notion, etc.)
2. **Generate new token** with same permissions
3. **Rotate across all projects**:
   ```bash
   /env-secrets-manager rotate COMPROMISED_TOKEN --emergency
   ```
4. **Scan git history** to ensure token not in commits:
   ```bash
   /env-secrets-manager scan --history --secret COMPROMISED_TOKEN
   ```
5. **Monitor** for unauthorized usage

### If .env File Accidentally Committed

1. **DO NOT just delete** the file in next commit (secret remains in history)
2. **Rotate all secrets** in that file immediately
3. **Remove from git history**:
   ```bash
   /env-secrets-manager scan --fix --file .env.local
   ```
4. **Force push** (coordinate with team)

---

## Advanced Features

### Secret Encryption (Coming Soon)

Encrypt secrets at rest:
```bash
# Encrypt all .env files
/env-secrets-manager encrypt

# Decrypt for use
/env-secrets-manager decrypt --project empathy-ledger
```

### Cloud Secret Manager Integration

Sync with cloud providers:
- AWS Secrets Manager
- Google Cloud Secret Manager
- Azure Key Vault

### Team Secret Sharing

Share secrets securely with team:
```bash
# Export encrypted bundle
/env-secrets-manager export --encrypted > secrets.enc

# Team member imports
/env-secrets-manager import < secrets.enc
```

---

## Files Created/Managed

### Local Files
- `.env.local` - Development secrets (each project)
- `.env.template` - Template with placeholder values (committed)
- `.gitignore` - Ensures .env files never committed

### Central Vault
- `~/act-global-infrastructure/.secrets-vault/` - Master secret storage (encrypted)
- `~/act-global-infrastructure/.secrets-vault/audit-logs/` - Rotation history

### Documentation
- `SECRETS_INVENTORY.md` - Which secrets exist where
- `ROTATION_LOG.md` - When tokens were last rotated

---

## Success Metrics

### Security
- ✅ Zero hardcoded secrets in source
- ✅ Zero .env files in git history
- ✅ All tokens rotated within policy
- ✅ All environments in sync

### Reliability
- ✅ No authentication failures
- ✅ No "token invalid" errors in logs
- ✅ All GitHub Actions passing
- ✅ All Vercel deploys successful

### Maintainability
- ✅ New projects setup in < 5 minutes
- ✅ Token rotation takes < 10 minutes
- ✅ Secret audit runs in < 1 minute
- ✅ Team can self-serve secret issues

---

## Support

**Issues?**
- Run audit first: `/env-secrets-manager audit`
- Check common issues section above
- Review security scan: `/env-secrets-manager scan`

**Questions?**
- Documentation: This file
- Examples: See command reference above

---

**Last Updated**: 2025-12-27
**Maintained By**: ACT Global Infrastructure
**Status**: ✅ Production Ready
