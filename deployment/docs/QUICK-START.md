# ACT Ecosystem - Quick Start Guide

## 🚀 One-Command Deployment

From **anywhere** in your terminal, just type:

```bash
act-start
```

That's it! All 6 ACT sites will launch in Chrome with one command.

---

## 📋 All Commands (Available Anywhere)

```bash
act-start      # Start all 6 sites + open Chrome
act-stop       # Stop all sites
act-restart    # Restart all sites
act-status     # Show which sites are running
act-logs       # View live logs from all sites
act-monitor    # Open PM2 dashboard
```

---

## 🌐 Your Sites

Once running, access them at:

- **ACT Regenerative Studio**: http://localhost:3002
- **Empathy Ledger**: http://localhost:3001
- **JusticeHub**: http://localhost:3003
- **The Harvest Website**: http://localhost:3004
- **ACT Farm**: http://localhost:3005
- **ACT Placemat**: http://localhost:3999

---

## 🎯 Common Workflows

### Start Your Day
```bash
act-start
# Chrome opens with all 6 sites ready to go
```

### Check Status
```bash
act-status
# See which sites are online
```

### View Logs (Debugging)
```bash
act-logs
# Ctrl+C to exit
```

### End of Day
```bash
act-stop
# Clean shutdown
```

### Quick Restart (After Code Changes)
```bash
act-restart
# All sites reload
```

---

## 🛠 Advanced PM2 Commands

If you need more control:

```bash
pm2 list                    # Show all processes
pm2 restart justicehub      # Restart just one site
pm2 logs justicehub         # Logs for one site
pm2 monit                   # Interactive dashboard
pm2 delete all              # Nuclear option (stop + remove)
```

---

## ✅ First Time Setup (Already Done!)

You're all set! The aliases are in your `~/.zshrc` file.

To reload them without restarting your terminal:
```bash
source ~/.zshrc
```

---

## 📁 Files Location

Everything is here:
```
/Users/benknight/Code/act-regenerative-studio/
├── ecosystem.config.js              # PM2 configuration
├── scripts/
│   ├── deploy-act-ecosystem.sh     # Main deployment script
│   └── open-all-sites.applescript  # Chrome automation
└── logs/                            # PM2 log files
```

---

## 🆘 Troubleshooting

### Sites won't start
```bash
act-logs
# Check for errors
```

### Port already in use
```bash
act-stop
act-start
```

### Chrome doesn't open
Sites are still running! Just visit http://localhost:3002 manually.

Or manually trigger browser:
```bash
osascript /Users/benknight/Code/act-regenerative-studio/scripts/open-all-sites.applescript
```

### One site keeps crashing
```bash
pm2 logs <site-name>     # Check specific logs
pm2 restart <site-name>  # Restart just that site
```

Site names: `act-studio`, `empathy-ledger`, `justicehub`, `harvest`, `act-farm`, `placemat`

---

## 💡 Pro Tips

1. **Sites persist** - They keep running even if you close your terminal
2. **Auto-restart** - If a site crashes, PM2 automatically restarts it (max 10 times)
3. **Chrome DevTools** - All sites open in Chrome for best debugging experience
4. **Logs are timestamped** - Find them in `/Users/benknight/Code/act-regenerative-studio/logs/`

---

**Made with ❤️ for the ACT Ecosystem**

Last Updated: 2025-12-31
