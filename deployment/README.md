# ACT Ecosystem - Global Deployment Infrastructure

**Location**: `/Users/benknight/act-global-infrastructure/deployment/`

This is the **global deployment system** for all ACT ecosystem projects. It uses PM2 process management + Chrome browser automation for a production-quality local development environment.

---

## 🚀 Quick Start

From **anywhere** in your terminal:

```bash
act-start      # Start all 6 sites + Chrome
act-stop       # Stop all sites
act-status     # Show running sites
```

---

## 📁 Directory Structure

```
deployment/
├── ecosystem.config.cjs          # PM2 configuration for all 6 sites
├── scripts/
│   ├── deploy-act-ecosystem.sh  # Main deployment orchestration
│   └── open-all-sites.applescript # Chrome browser automation
├── logs/                         # Centralized logs for all sites
└── docs/                         # Documentation
    ├── QUICK-START.md           # Daily usage reference
    ├── README-DEPLOYMENT.md     # Technical documentation
    └── SETUP-COMPLETE.md        # Setup summary
```

---

## 🌐 Sites Managed

All sites run from their **project-specific** locations but are managed **globally** from here:

| Site | Location | Port |
|------|----------|------|
| ACT Studio | `/Users/benknight/Code/act-regenerative-studio` | 3002 |
| Empathy Ledger | `/Users/benknight/Code/empathy-ledger-v2` | 3001 |
| JusticeHub | `/Users/benknight/Code/JusticeHub` | 3003 |
| The Harvest | `/Users/benknight/Code/The Harvest Website` | 3004 |
| ACT Farm | `/Users/benknight/Code/act-farm` | 3005 |
| ACT Placemat | `/Users/benknight/Code/ACT Placemat` | 3999 |

---

## 💡 Architecture Philosophy

### Global Infrastructure (This Directory)
- ✅ **Deployment orchestration** - Start/stop/monitor all sites
- ✅ **Process management** - PM2 configuration
- ✅ **Browser automation** - Chrome tab management
- ✅ **Centralized logging** - All logs in one place
- ✅ **Shared tooling** - Scripts that work across all projects

### Project-Specific Code (Individual Repos)
- ✅ **Application code** - Each project's src/, components/, etc.
- ✅ **Project dependencies** - package.json, node_modules
- ✅ **Project config** - .env files, project-specific settings
- ✅ **Project documentation** - README specific to that project

**This separation keeps:**
- Global tools global (here)
- Project code isolated (in each repo)
- Everything accessible from anywhere via shell aliases

---

## 🔧 How It Works

1. **Shell Aliases** (in `~/.zshrc`)
   - Point to scripts in **this** directory
   - Work from **anywhere** in your terminal

2. **PM2 Configuration** (`ecosystem.config.cjs`)
   - Defines **where** each project lives
   - Configures ports, environment variables
   - Points logs to **this** directory

3. **Deployment Script** (`scripts/deploy-act-ecosystem.sh`)
   - Uses PM2 to start all processes
   - Triggers Chrome browser automation
   - Shows unified status dashboard

4. **Centralized Logs** (`logs/`)
   - All PM2 logs stored here
   - Easy to find and debug
   - Timestamped and organized

---

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICK-START.md)** - Daily reference
- **[Full Deployment Docs](./docs/README-DEPLOYMENT.md)** - Technical details
- **[Setup Complete](./docs/SETUP-COMPLETE.md)** - What's configured

---

## 🛠 Direct Usage

You can also use the scripts directly:

```bash
cd /Users/benknight/act-global-infrastructure/deployment
./scripts/deploy-act-ecosystem.sh start
```

---

## ⚙️ Modifying the Configuration

### Add a New Site

Edit `ecosystem.config.cjs`:

```javascript
{
  name: 'new-site',
  script: npmPath,
  args: 'run dev',
  cwd: '/Users/benknight/Code/new-project',
  env: {
    PORT: 3010,
    NODE_ENV: 'development',
    PATH: process.env.PATH,
  },
  error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/new-site-error.log',
  out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/new-site-out.log',
  // ... rest of config
}
```

### Change Port Numbers

Update the `PORT` value in `ecosystem.config.cjs` for the specific site.

### Update Log Location

Logs are centralized in this directory: `./logs/`

---

## 🎯 Why This Structure?

**Before**: Deployment code scattered across individual project repos
**After**: **One** deployment system manages **all** projects

**Benefits**:
- ✅ Single source of truth for infrastructure
- ✅ Consistent deployment across all projects
- ✅ Easy to maintain and update
- ✅ Centralized logging and monitoring
- ✅ Global access via shell aliases
- ✅ Project code stays isolated and clean

---

**Last Updated**: 2025-12-31
**Status**: ✅ Production Ready
