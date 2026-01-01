# Bitwarden Team Setup - ACT Ecosystem
**Date**: 2026-01-01
**Purpose**: Secure, open-source password management for ACT development team

---

## Why Bitwarden?

✅ **Open Source** - Full transparency, auditable code
✅ **Team Sharing** - Secure vaults for shared secrets
✅ **CLI Integration** - Works with Claude Code and scripts
✅ **Self-Hostable** - Optional Vaultwarden for complete control
✅ **Free for Teams** - Free plan supports unlimited users
✅ **Cross-Platform** - Desktop, mobile, browser, CLI

---

## Quick Start

### 1. Create Bitwarden Account

**Option A: Cloud (Recommended for Most Teams)**
```bash
# Go to https://bitwarden.com
# Click "Get Started"
# Create account with strong master password
```

**Option B: Self-Hosted (Vaultwarden)**
```bash
# For teams wanting complete control
# Setup guide: https://github.com/dani-garcia/vaultwarden
# Requires: Docker, domain name, SSL certificate
```

### 2. Install Bitwarden CLI

**macOS**:
```bash
brew install bitwarden-cli
bw --version
```

**Linux**:
```bash
npm install -g @bitwarden/cli
bw --version
```

**Windows**:
```powershell
choco install bitwarden-cli
bw --version
```

### 3. Login to Bitwarden

```bash
# Login (one-time)
bw login your.email@example.com

# Unlock vault (each session)
bw unlock

# Set session token (copy from unlock output)
export BW_SESSION="your-session-token-here"

# Or unlock and set in one command:
export BW_SESSION=$(bw unlock --raw)
```

**💡 Tip**: Add to your shell profile for convenience:
```bash
# ~/.zshrc or ~/.bashrc
alias bwu='export BW_SESSION=$(bw unlock --raw)'
```

---

## Team Organization Setup

### For Team Lead / Admin

#### 1. Create Organization
```bash
# Via Web UI
1. Login to https://vault.bitwarden.com
2. Click "New Organization"
3. Name: "ACT Global"
4. Choose plan (Free supports unlimited users)
5. Complete setup
```

#### 2. Invite Team Members
```bash
# Via Web UI
1. Go to Organization → Manage → People
2. Click "Invite User"
3. Enter email address
4. Select "User" role
5. Send invitation
```

#### 3. Create Collections
```bash
# Organize secrets by project
Collections to create:
├── Shared Infrastructure (Supabase, Anthropic, etc.)
├── JusticeHub
├── The Harvest Website
├── ACT Farm
├── Empathy Ledger
└── CI/CD Tokens
```

---

## Setting Up Secrets

### Method 1: Via Web UI (Easiest)

#### For Project-Specific Secrets

```bash
# 1. Login to https://vault.bitwarden.com
# 2. Go to Organization vault
# 3. Click "New Item"
# 4. Choose "Secure Note"
# 5. Name: "JusticeHub Environment Variables"
# 6. In Notes field, add:

# JusticeHub Environment Variables
# Last Updated: 2026-01-01

NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...

# 7. Save
# 8. Share with collection "JusticeHub"
```

### Method 2: Via CLI (Advanced)

```bash
# Create secure note via CLI
cat > /tmp/item.json << EOF
{
  "organizationId": null,
  "type": 2,
  "name": "JusticeHub Environment Variables",
  "notes": "NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=eyJ...",
  "secureNote": {
    "type": 0
  }
}
EOF

# Create item
bw encode < /tmp/item.json | bw create item

# Sync to server
bw sync
```

### Method 3: Backup Existing .env (Recommended)

```bash
# Use the env-manager skill
cd /Users/benknight/Code/JusticeHub
node ~/.claude/skills/env-manager/scripts/backup-to-bitwarden.mjs

# This will:
# - Read your .env.local
# - Create/update Bitwarden secure note
# - Encrypt and sync to cloud
```

---

## Team Member Workflow

### Initial Setup (Once)

```bash
# 1. Accept Bitwarden organization invitation (email)
# 2. Create Bitwarden account
# 3. Install CLI: brew install bitwarden-cli
# 4. Login: bw login your.email@example.com
# 5. Unlock: export BW_SESSION=$(bw unlock --raw)
```

### Daily Development

```bash
# When starting work on a new project
cd /Users/benknight/Code/JusticeHub

# Sync secrets from Bitwarden
node ~/.claude/skills/env-manager/scripts/sync-from-bitwarden.mjs

# Or use Claude Code skill
/env-manager sync-bitwarden /Users/benknight/Code/JusticeHub

# Start development
npm run dev
```

### After Changing Secrets

```bash
# Update Bitwarden with new secrets
node ~/.claude/skills/env-manager/scripts/backup-to-bitwarden.mjs

# Or use Claude Code skill
/env-manager backup-bitwarden /Users/benknight/Code/JusticeHub

# Team members will sync new secrets next time
```

---

## Security Best Practices

### Master Password

✅ **DO**:
- Use **20+ characters**
- Use unique password (not reused)
- Use passphrase (e.g., "correct horse battery staple mountain")
- Store in secure location (brain, physical safe)

❌ **DON'T**:
- Reuse password from other services
- Share master password
- Write it down digitally
- Use weak password

**💡 Recommended Format**:
```
5-6 random words + numbers + symbols
Example: Mountain42!Tree$Ocean#Cloud88
```

### Session Token

```bash
# Session token gives access to decrypted vault
# Keep it secure!

# ✅ DO: Use environment variable
export BW_SESSION="token-here"

# ❌ DON'T: Hard-code in scripts
# ❌ DON'T: Commit to git
# ❌ DON'T: Share via Slack

# Lock vault when done
bw lock
```

### Two-Factor Authentication (2FA)

```bash
# Enable 2FA for extra security
1. Login to https://vault.bitwarden.com
2. Settings → Security → Two-step Login
3. Choose authenticator app (Authy, Google Authenticator)
4. Scan QR code
5. Save recovery code in safe place
```

---

## Common Commands Reference

### Vault Management

```bash
# Login
bw login your.email@example.com

# Unlock vault
export BW_SESSION=$(bw unlock --raw)

# Lock vault
bw lock

# Logout
bw logout

# Sync with server
bw sync

# Check status
bw status
```

### Searching & Retrieving

```bash
# List all items
bw list items

# Search for items
bw list items --search "JusticeHub"

# Get specific item
bw get item "item-id"

# Get password from item
bw get password "item-name"

# Get note from item
bw get notes "item-name"
```

### Organization

```bash
# List organizations
bw list organizations

# List collections
bw list collections

# Create item in organization
bw create item --organizationid "org-id" < item.json
```

---

## Troubleshooting

### "Not logged in"

```bash
# Solution:
bw login your.email@example.com
```

### "Vault is locked"

```bash
# Solution:
export BW_SESSION=$(bw unlock --raw)
```

### "Session token expired"

```bash
# Solution: Unlock again
bw lock
export BW_SESSION=$(bw unlock --raw)
```

### "Item not found"

```bash
# Check if synced
bw sync

# List all items to find correct name
bw list items | grep -i "justicehub"
```

### "Permission denied"

```bash
# Check organization access
bw list organizations

# Contact organization admin to add you to collection
```

---

## Integration with ACT Workflow

### Scenario 1: New Team Member Onboarding

```bash
# Day 1: Setup
1. Receive Bitwarden invitation email
2. Create account at https://bitwarden.com
3. Install CLI: brew install bitwarden-cli
4. Login: bw login your.email@example.com

# For each project:
cd ~/Code/JusticeHub
/env-manager sync-bitwarden .

cd ~/Code/act-farm
/env-manager sync-bitwarden .

# Done! All secrets synced, ready to develop
```

### Scenario 2: Rotating API Keys (Quarterly)

```bash
# Admin updates keys in Bitwarden web UI
1. Login to vault.bitwarden.com
2. Find "JusticeHub Environment Variables"
3. Update ANTHROPIC_API_KEY with new key
4. Save

# Team members sync
cd ~/Code/JusticeHub
/env-manager sync-bitwarden .

# New key automatically pulled
```

### Scenario 3: Adding New Project

```bash
# Admin creates new project secrets
1. Create .env.local for new project
2. Run: /env-manager backup-bitwarden ~/Code/new-project
3. Share with team via Bitwarden collection

# Team members sync
/env-manager sync-bitwarden ~/Code/new-project
```

---

## Emergency Procedures

### Lost Master Password

❌ **Cannot be recovered** - Bitwarden uses zero-knowledge encryption

**Prevention**:
- Write master password on paper, store in physical safe
- Share with trusted team member (encrypted)
- Use memorable passphrase

### Account Locked (Too Many Failed Attempts)

```bash
# Wait 15 minutes
# Or use recovery code (if enabled)
# Contact support: https://bitwarden.com/contact
```

### Organization Admin Leaves

```bash
# Ensure multiple admins
1. Organization → Manage → People
2. Promote trusted member to Admin
3. Never have single point of failure
```

### Leaked Session Token

```bash
# Immediately lock vault
bw lock

# Logout
bw logout

# Login again with new session
bw login
export BW_SESSION=$(bw unlock --raw)
```

---

## Migration from Current Backups

### From backups/env-backups/ Folder

```bash
# For each project:
cd /Users/benknight/Code/JusticeHub

# 1. Ensure .env.local is current
cp .env.local.backup-20251230 .env.local  # if needed

# 2. Backup to Bitwarden
/env-manager backup-bitwarden .

# 3. Verify in Bitwarden web UI
# 4. Delete local backup
rm -rf backups/env-backups/

# 5. Team can now sync from Bitwarden
```

---

## Advanced: Self-Hosted Vaultwarden

### Why Self-Host?

✅ Complete data control
✅ No monthly fees (free forever)
✅ Same features as Bitwarden cloud
✅ Faster sync (local network)
✅ Compliance (data sovereignty)

### Quick Setup (Docker)

```bash
# 1. Install Docker
# 2. Run Vaultwarden
docker run -d --name vaultwarden \
  -v /vw-data/:/data/ \
  -p 80:80 \
  vaultwarden/server:latest

# 3. Access at http://localhost
# 4. Create first account (becomes admin)
# 5. Configure domain + SSL for production

# Full guide: https://github.com/dani-garcia/vaultwarden/wiki
```

### CLI Configuration for Self-Hosted

```bash
# Point CLI to self-hosted instance
bw config server https://vault.actglobal.eco

# Then login normally
bw login your.email@actglobal.eco
```

---

## Comparison: Cloud vs Self-Hosted

| Feature | Bitwarden Cloud | Vaultwarden (Self-Hosted) |
|---------|----------------|--------------------------|
| **Setup** | 5 minutes | 1-2 hours |
| **Cost** | Free (teams) | Free (hosting cost only) |
| **Maintenance** | None | You manage |
| **Reliability** | 99.9% uptime | You manage |
| **Compliance** | US servers | Your choice |
| **Team Size** | Unlimited (free) | Unlimited |
| **Mobile Apps** | Yes | Yes (same apps) |
| **CLI** | Yes | Yes (same CLI) |

**Recommendation**: Start with **Bitwarden Cloud**, migrate to self-hosted if needed.

---

## Cost Breakdown

### Bitwarden Cloud

```
Free Plan:
✅ Unlimited items
✅ Unlimited devices
✅ 2 users per organization
✅ Basic sharing

Families ($40/year):
✅ 6 users
✅ Unlimited collections
✅ 1 GB storage

Teams ($3/user/month):
✅ Unlimited users
✅ Advanced sharing
✅ Event logs
✅ Priority support
```

**ACT Ecosystem Recommendation**: Free plan initially, upgrade to Families if team grows beyond 2.

### Vaultwarden (Self-Hosted)

```
One-time setup:
- Domain: $12/year
- SSL: Free (Let's Encrypt)
- Hosting: $5-20/month (DigitalOcean, AWS, etc.)

Total: ~$60-240/year (all-inclusive)
```

---

## Next Steps

### For Team Lead

- [ ] Create Bitwarden organization
- [ ] Invite team members
- [ ] Create collections for each project
- [ ] Migrate secrets from backup folder
- [ ] Document team-specific workflow
- [ ] Schedule quarterly key rotation

### For Team Members

- [ ] Accept Bitwarden invitation
- [ ] Install CLI: `brew install bitwarden-cli`
- [ ] Login: `bw login your.email@example.com`
- [ ] Sync project secrets: `/env-manager sync-bitwarden`
- [ ] Delete local backup files
- [ ] Enable 2FA for account security

### For Everyone

- [ ] Store master password securely
- [ ] Enable 2FA
- [ ] Test sync workflow
- [ ] Add to daily routine
- [ ] Update when secrets change

---

## Support & Resources

- **Bitwarden Help**: https://bitwarden.com/help/
- **CLI Documentation**: https://bitwarden.com/help/cli/
- **Vaultwarden**: https://github.com/dani-garcia/vaultwarden
- **ACT env-manager Skill**: `~/.claude/skills/env-manager/skill.md`

---

**Created**: 2026-01-01
**Last Updated**: 2026-01-01
**Maintained By**: ACT Infrastructure Team
**License**: Open Source (MIT)
