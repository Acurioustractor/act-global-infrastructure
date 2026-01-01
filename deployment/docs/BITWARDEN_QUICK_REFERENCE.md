# Bitwarden Quick Reference - ACT Ecosystem

**One-page cheat sheet for daily use**

---

## 🚀 First Time Setup (5 minutes)

```bash
# 1. Install CLI
brew install bitwarden-cli

# 2. Login
bw login your.email@example.com

# 3. Unlock (get session token)
export BW_SESSION=$(bw unlock --raw)

# 4. Sync a project
cd ~/Code/JusticeHub
/env-manager sync-bitwarden .

# Done!
```

---

## 📋 Daily Commands

### Start of Day

```bash
# Unlock vault
export BW_SESSION=$(bw unlock --raw)

# Or add alias to ~/.zshrc:
alias bwu='export BW_SESSION=$(bw unlock --raw)'

# Then just:
bwu
```

### Sync Project Secrets

```bash
# Sync one project
cd ~/Code/JusticeHub
/env-manager sync-bitwarden .

# Or direct script
node ~/.claude/skills/env-manager/scripts/sync-from-bitwarden.mjs .
```

### Backup After Changes

```bash
# After updating .env.local
/env-manager backup-bitwarden .

# Or direct script
node ~/.claude/skills/env-manager/scripts/backup-to-bitwarden.mjs .
```

### End of Day

```bash
# Lock vault
bw lock
```

---

## 🔍 Common Tasks

### Check Status

```bash
bw status
```

### Search for Secrets

```bash
# List all items
bw list items

# Search for project
bw list items --search "JusticeHub"

# Get specific secret
bw get password "API Key Name"
```

### Sync with Server

```bash
bw sync
```

### View Item Details

```bash
# List items to find ID
bw list items | grep -i "justicehub"

# Get item by ID
bw get item "item-id"

# Get notes from secure note
bw get notes "JusticeHub Environment Variables"
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not logged in" | `bw login your.email@example.com` |
| "Vault locked" | `export BW_SESSION=$(bw unlock --raw)` |
| "Session expired" | `bw lock && bwu` |
| "Item not found" | `bw sync` then search again |
| "Permission denied" | Contact admin for collection access |

---

## 🏗️ Project Setup

### New Project

```bash
# 1. Create .env.local
cd ~/Code/new-project
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
ANTHROPIC_API_KEY=sk-ant-...
EOF

# 2. Backup to Bitwarden
/env-manager backup-bitwarden .

# 3. Share via web UI (vault.bitwarden.com)
```

### Existing Project

```bash
# 1. Sync from Bitwarden
cd ~/Code/existing-project
/env-manager sync-bitwarden .

# 2. Start developing
npm run dev
```

---

## 📊 ACT Projects

```bash
# JusticeHub
cd /Users/benknight/Code/JusticeHub
/env-manager sync-bitwarden .

# The Harvest Website
cd "/Users/benknight/Code/The Harvest Website"
/env-manager sync-bitwarden .

# ACT Farm
cd /Users/benknight/Code/act-farm
/env-manager sync-bitwarden .

# Empathy Ledger
cd /Users/benknight/Code/empathy-ledger-v2
/env-manager sync-bitwarden .
```

---

## 🔐 Security Checklist

- [ ] Master password is 20+ characters
- [ ] Master password is unique (not reused)
- [ ] 2FA enabled on Bitwarden account
- [ ] Session token never committed to git
- [ ] Vault locked when not in use
- [ ] .env.local is gitignored
- [ ] Local backups deleted after Bitwarden backup

---

## 🌐 Web Access

```
Login: https://vault.bitwarden.com

View/Edit:
1. Login with master password
2. Find item (e.g., "JusticeHub Environment Variables")
3. Edit secrets
4. Save
5. Team members sync to get updates
```

---

## 🚨 Emergency

### Lost Master Password
**Cannot be recovered** - Bitwarden is zero-knowledge
→ Contact team lead if shared vault
→ Use recovery code if enabled

### Leaked Session Token
```bash
bw lock
bw logout
bw login
export BW_SESSION=$(bw unlock --raw)
```

### Compromised Secret
```bash
# 1. Update in Bitwarden web UI
# 2. Tell team to sync:
/env-manager sync-bitwarden .
```

---

## 📚 Links

- **Setup Guide**: `BITWARDEN_TEAM_SETUP.md`
- **Full Docs**: `BITWARDEN_INTEGRATION_COMPLETE.md`
- **env-manager Skill**: `~/.claude/skills/env-manager/skill.md`
- **Bitwarden Help**: https://bitwarden.com/help/

---

**Print this page and keep it handy!**
