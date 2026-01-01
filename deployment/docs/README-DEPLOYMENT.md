# ACT Ecosystem - Production-Quality Local Deployment

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-31
**Method**: PM2 Process Manager + AppleScript Browser Automation

---

## 🚀 Quick Start (One Command)

```bash
cd /Users/benknight/Code/act-regenerative-studio
./scripts/deploy-act-ecosystem.sh start
```

That's it! All 6 sites will:
- ✅ Start reliably (PM2 production-grade process manager)
- ✅ Open in ONE Chrome window (6 tabs, not 6 windows)
- ✅ Auto-restart if they crash
- ✅ Persist after you close the terminal
- ✅ Show you a beautiful status dashboard

---

## 📋 All Commands

```bash
# Start all servers
./scripts/deploy-act-ecosystem.sh start

# Stop all servers
./scripts/deploy-act-ecosystem.sh stop

# Restart all servers
./scripts/deploy-act-ecosystem.sh restart

# Show status
./scripts/deploy-act-ecosystem.sh status

# View live logs
./scripts/deploy-act-ecosystem.sh logs

# Open monitoring dashboard
./scripts/deploy-act-ecosystem.sh monitor
```

---

## 🌐 Sites Deployed

| Site | Port | URL | Status |
|------|------|-----|--------|
| ACT Regenerative Studio | 3002 | http://localhost:3002 | ✅ Online |
| Empathy Ledger | 3001 | http://localhost:3001 | ✅ Online |
| JusticeHub | 3003 | http://localhost:3003 | ✅ Online |
| The Harvest Website | 3004 | http://localhost:3004 | ✅ Online |
| ACT Farm | 3005 | http://localhost:3005 | ✅ Online |
| ACT Placemat | 3999 | http://localhost:3999 | ✅ Online |

---

## 🛠 PM2 Commands (Advanced)

```bash
# List all processes
pm2 list

# View logs for specific site
pm2 logs act-studio
pm2 logs empathy-ledger
pm2 logs justicehub
pm2 logs harvest
pm2 logs act-farm
pm2 logs placemat

# Restart specific site
pm2 restart act-studio

# Stop specific site
pm2 stop act-studio

# Real-time monitoring dashboard
pm2 monit

# Save current PM2 state (survives reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

---

## 📊 Monitoring Dashboard

Press `pm2 monit` to open the interactive dashboard:

```
┌─────────────────────────────────────────────────────────┐
│ PM2 Monitoring Dashboard                                │
├─────────────────────────────────────────────────────────┤
│ act-studio        │ CPU: 2%  │ MEM: 150MB │ ↺ 0        │
│ empathy-ledger    │ CPU: 1%  │ MEM: 145MB │ ↺ 0        │
│ justicehub        │ CPU: 1%  │ MEM: 152MB │ ↺ 0        │
│ harvest           │ CPU: 1%  │ MEM: 148MB │ ↺ 0        │
│ act-farm          │ CPU: 1%  │ MEM: 147MB │ ↺ 0        │
│ placemat          │ CPU: 1%  │ MEM: 149MB │ ↺ 0        │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Logs

All logs are stored in:
```
/Users/benknight/Code/act-regenerative-studio/logs/
├── act-studio-error.log
├── act-studio-out.log
├── empathy-ledger-error.log
├── empathy-ledger-out.log
├── justicehub-error.log
├── justicehub-out.log
├── harvest-error.log
├── harvest-out.log
├── act-farm-error.log
├── act-farm-out.log
├── placemat-error.log
└── placemat-out.log
```

View logs live:
```bash
pm2 logs              # All logs
pm2 logs act-studio   # Specific site
tail -f logs/act-studio-out.log  # Direct file access
```

---

## 🎯 Claude Code Skill

Use the `/act-deploy` skill for easy access:

```bash
/act-deploy start    # Start all servers
/act-deploy stop     # Stop all servers
/act-deploy status   # Show status
/act-deploy logs     # View logs
/act-deploy monitor  # Open dashboard
```

---

## 🔧 Configuration Files

### PM2 Ecosystem Config
**File**: `ecosystem.config.js`

Defines all 6 processes with:
- Working directory
- Port allocation
- Environment variables
- Log file paths
- Auto-restart settings

### Browser Automation
**File**: `scripts/open-all-sites.applescript`

AppleScript that opens all 6 sites as tabs in ONE Chrome window.

### Deployment Script
**File**: `scripts/deploy-act-ecosystem.sh`

Main orchestration script with commands: start, stop, restart, status, logs, monitor.

---

## ✅ Why This Method is Better

| Feature | Old (tmux) | New (PM2) |
|---------|------------|-----------|
| **Reliability** | ❌ Inconsistent, servers don't start | ✅ Production-grade, works every time |
| **Browser** | ❌ Opens 6 separate windows | ✅ One window, 6 tabs |
| **Persistence** | ❌ Dies when terminal closes | ✅ Runs in background daemon |
| **Monitoring** | ⚠️ Manual tmux panes | ✅ pm2 monit dashboard |
| **Logs** | ⚠️ Scattered, hard to find | ✅ Centralized, timestamped |
| **Auto-restart** | ❌ No | ✅ Yes (max 10 per process) |
| **Status Check** | ⚠️ Manual inspection | ✅ `pm2 list` instant status |
| **Selective Restart** | ❌ Must restart all | ✅ Restart individual sites |
| **Production-Ready** | ❌ Development only | ✅ Same tool used in production |

---

## 🐛 Troubleshooting

### Servers won't start
```bash
pm2 logs
```
Check error logs for each process.

### Port already in use
```bash
./scripts/deploy-act-ecosystem.sh stop
./scripts/deploy-act-ecosystem.sh start
```

### Browser doesn't open
Manually run the AppleScript:
```bash
osascript scripts/open-all-sites.applescript
```

### One server keeps crashing
```bash
pm2 logs <server-name>  # Check logs
pm2 restart <server-name>  # Try restart
```

### PM2 out of date warning
```bash
pm2 update
```

---

## 🎉 Success Indicators

When deployment is successful, you'll see:

1. **All 6 processes showing "online"** in pm2 list
2. **Safari opens with 6 tabs** automatically
3. **Each site loads** without errors
4. **Servers persist** even after closing terminal
5. **Logs are clean** (no errors in pm2 logs)

---

## 📚 Learn More

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **AppleScript Guide**: https://developer.apple.com/library/archive/documentation/AppleScript/

---

## 👨‍💻 Maintainer

**Ben Knight** - ben@actglobal.eco

For issues or improvements, update the configuration files and commit to the repository.

---

**This deployment system is production-ready and battle-tested.** It uses the same tools (PM2) that power production applications worldwide, adapted for local development with maximum reliability and convenience.
