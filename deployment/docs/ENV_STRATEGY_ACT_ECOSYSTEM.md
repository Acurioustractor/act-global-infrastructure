# ACT Ecosystem .ENV Strategy
**Date**: 2026-01-01
**Purpose**: Unified, secure, scalable environment variable management across all ACT projects

---

## Current State Audit

### JusticeHub (7 .env files) ⚠️
```
.env.local                    # Active secrets
.env.local.example           # Template (redundant)
.env.local.backup-20251230   # Backup (insecure location)
.env.development             # Development vars
.env.docker                  # Docker vars
.env.example                 # Generic template
.env.schema.json             # Schema definition
```

### Other ACT Projects
- **The Harvest Website**: 5 .env files
- **ACT Farm**: 4 .env files
- **Empathy Ledger**: 3 .env files

**Problem**: Inconsistent, redundant, unclear precedence

---

## ✅ Recommended Standard Structure

### For ALL ACT Ecosystem Projects

```
project-root/
├── .env.local              # Active secrets (GITIGNORED, never commit)
├── .env.example            # Public template (COMMITTED)
├── .env.schema.json        # Validation schema (COMMITTED, optional)
└── .gitignore              # Must include .env.local
```

### Rules

1. **ONE active file**: `.env.local` (gitignored)
2. **ONE template**: `.env.example` (committed as documentation)
3. **ONE schema** (optional): `.env.schema.json` for validation
4. **ZERO** committed secrets
5. **ZERO** environment-specific files (use runtime detection)

---

## File Purposes

### `.env.local` (NEVER COMMIT)
- **Purpose**: Active secrets for local development
- **Contains**: API keys, database URLs, service credentials
- **Gitignored**: YES (must be in .gitignore)
- **Shared**: NO (each developer has their own)
- **Backup**: Store in password manager, NOT in repo

```bash
# .env.local example
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
```

### `.env.example` (COMMITTED)
- **Purpose**: Template and documentation
- **Contains**: Variable names with placeholder values
- **Gitignored**: NO (committed to repo)
- **Shared**: YES (everyone uses same template)
- **Updated**: When new vars are added

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
FIRECRAWL_API_KEY=fc-your_key_here

# Instructions:
# 1. Copy this file to .env.local
# 2. Replace placeholders with real values
# 3. Never commit .env.local
```

### `.env.schema.json` (COMMITTED, optional)
- **Purpose**: Validate env vars at runtime
- **Contains**: Type definitions, required fields, validation rules
- **Gitignored**: NO (committed to repo)
- **Used by**: Build scripts, runtime validators

```json
{
  "required": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "optional": ["ANTHROPIC_API_KEY", "FIRECRAWL_API_KEY"],
  "types": {
    "NEXT_PUBLIC_SUPABASE_URL": "url",
    "SUPABASE_SERVICE_ROLE_KEY": "string",
    "ANTHROPIC_API_KEY": "string"
  }
}
```

---

## Environment Detection

Instead of multiple .env files, use runtime detection:

### Next.js (automatic)
```javascript
// next.config.js
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

// Use same .env.local, behavior changes based on NODE_ENV
```

### Docker (use .env.local)
```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.local  # Single source of truth
    environment:
      - NODE_ENV=development
```

### Production (use platform env vars)
- **Vercel**: Set env vars in dashboard
- **Railway**: Set env vars in dashboard
- **Docker**: Use secrets or env injection
- **Never** commit production secrets

---

## Migration Plan for JusticeHub

### REMOVE these files:
```bash
rm .env.development              # Redundant (use NODE_ENV)
rm .env.docker                   # Redundant (use .env.local)
rm .env.local.example            # Redundant (use .env.example)
mv .env.local.backup-20251230 backups/  # Move to safe location
```

### KEEP these files:
```bash
.env.local        # Active secrets (gitignored)
.env.example      # Template (committed)
.env.schema.json  # Schema (committed, optional)
```

### UPDATE .gitignore:
```bash
# Environment variables
.env.local
.env*.local
.env.development.local
.env.test.local
.env.production.local
*.env.backup*

# But DO commit templates
!.env.example
!.env.schema.json
```

---

## Security Best Practices

### ✅ DO
1. **Store secrets in .env.local** only
2. **Commit .env.example** with placeholders
3. **Use password manager** for backups (1Password, Bitwarden)
4. **Rotate keys regularly** (quarterly)
5. **Use different keys** for dev/staging/prod
6. **Validate env vars** at startup
7. **Document required vars** in .env.example

### ❌ DON'T
1. **Never commit .env.local**
2. **Never hardcode secrets** in code
3. **Never put secrets in docker images**
4. **Never share .env.local** in Slack/email
5. **Never put backups in repo** (use password manager)
6. **Never use same key** across environments
7. **Never log secrets** (sanitize logs)

---

## Validation Script

Create `scripts/validate-env.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

const schema = JSON.parse(readFileSync('.env.schema.json', 'utf8'));
const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';

const errors = [];

// Check required vars
schema.required.forEach(key => {
  if (!envLocal.includes(`${key}=`)) {
    errors.push(`Missing required: ${key}`);
  }
});

// Check for placeholders
if (envLocal.includes('your_key_here')) {
  errors.push('Found placeholder values - replace with real keys');
}

if (errors.length > 0) {
  console.error('❌ Environment validation failed:');
  errors.forEach(err => console.error(`   ${err}`));
  process.exit(1);
}

console.log('✅ Environment variables validated');
```

Add to package.json:
```json
{
  "scripts": {
    "validate:env": "node scripts/validate-env.mjs",
    "dev": "npm run validate:env && next dev",
    "build": "npm run validate:env && next build"
  }
}
```

---

## ACT Ecosystem Standard

### Apply to ALL projects:
1. JusticeHub
2. The Harvest Website
3. ACT Farm
4. Empathy Ledger
5. ACT Studio
6. ACT Placemat

### Standard Files:
```
project/
├── .env.local       # Secrets (gitignored)
├── .env.example     # Template (committed)
├── .gitignore       # Ignores .env.local
└── scripts/
    └── validate-env.mjs  # Validation script
```

### Deployment Settings:

**Vercel Projects**:
- JusticeHub: Manual env vars in dashboard
- The Harvest: Manual env vars in dashboard
- Empathy Ledger: Manual env vars in dashboard

**Local Development**:
- All projects: Use .env.local
- PM2 ecosystem: Reads from .env.local

---

## Cleanup Commands

### For JusticeHub:
```bash
cd /Users/benknight/Code/JusticeHub

# Create backups folder
mkdir -p backups/env-backups

# Move backup
mv .env.local.backup-20251230 backups/env-backups/

# Remove redundant files
rm .env.development
rm .env.docker
rm .env.local.example

# Keep only:
# .env.local (gitignored)
# .env.example (committed)
# .env.schema.json (committed)
```

### Verify .gitignore:
```bash
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
grep -q "^!\.env\.example$" .gitignore || echo "!.env.example" >> .gitignore
```

---

## Shared Secrets Management

For ACT ecosystem-wide secrets (Supabase, Anthropic, etc.):

### Option 1: Individual .env.local (Recommended)
Each project has its own .env.local with the same keys.

**Pros**:
- Simple, standard Next.js pattern
- No dependencies between projects
- Easy to understand

**Cons**:
- Duplicate values across projects
- Manual sync when keys rotate

### Option 2: Shared .env in act-global-infrastructure
Create `.env.shared` in infrastructure repo, symlink to projects.

**Pros**:
- Single source of truth
- One place to update keys

**Cons**:
- Complex setup
- Breaks if symlinks break
- Not standard Next.js pattern

**Recommendation**: Use Option 1 (individual files) + password manager for sync.

---

## Implementation Checklist

### Phase 1: JusticeHub Cleanup
- [ ] Create backups/env-backups/ folder
- [ ] Move .env.local.backup to backups/
- [ ] Delete .env.development
- [ ] Delete .env.docker
- [ ] Delete .env.local.example
- [ ] Verify .env.local exists and has all keys
- [ ] Verify .env.example is up-to-date
- [ ] Update .gitignore
- [ ] Create validate-env.mjs script
- [ ] Test npm run dev

### Phase 2: Extend to ACT Ecosystem
- [ ] Audit The Harvest Website
- [ ] Audit ACT Farm
- [ ] Audit Empathy Ledger
- [ ] Audit ACT Studio
- [ ] Standardize all projects
- [ ] Document in act-global-infrastructure

### Phase 3: Security Hardening
- [ ] Store all secrets in password manager
- [ ] Delete local backups after verification
- [ ] Set up quarterly key rotation
- [ ] Add env validation to CI/CD
- [ ] Document recovery procedures

---

## Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [The Twelve-Factor App - Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Status**: Ready to implement
**Priority**: High (security + consistency)
**Effort**: 2-3 hours across all projects
