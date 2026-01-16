# Clawdbot NAS Deployment Guide

Deploy Farmhand to your NAS for 24/7 Telegram access when your MacBook is off.

## Prerequisites

- NAS with Docker support (Synology, QNAP, etc.)
- SSH access to NAS
- Secrets from Bitwarden

## Quick Start

### 1. Build on Mac

```bash
cd ~/act-global-infrastructure/clawdbot-docker
./build-for-nas.sh
```

### 2. Create .env file

Copy `.env.example` to `.env` and fill in the secrets:

```bash
# Get secrets from Bitwarden
BWS_TOKEN=$(security find-generic-password -a "bws" -s "act-personal-ai" -w)
BWS_ACCESS_TOKEN="$BWS_TOKEN" ~/bin/bws secret list --output json | jq '.[] | "\(.key)=\(.value)"'
```

Required secrets:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `ANTHROPIC_API_KEY` - Claude API key
- `GOOGLE_SERVICE_ACCOUNT_KEY` - JSON (escape quotes or base64)
- `GOOGLE_DELEGATED_USER` - Email to impersonate
- `NOTION_TOKEN` - Notion integration token
- `EL_SUPABASE_URL` / `EL_SUPABASE_SERVICE_ROLE_KEY` - Empathy Ledger

### 3. Build Docker Image

```bash
docker build -t clawdbot-farmhand .
```

### 4. Transfer to NAS

**Option A: Docker registry**
```bash
docker tag clawdbot-farmhand your-registry/clawdbot-farmhand
docker push your-registry/clawdbot-farmhand
```

**Option B: Direct transfer**
```bash
docker save clawdbot-farmhand | gzip > clawdbot-farmhand.tar.gz
scp clawdbot-farmhand.tar.gz admin@nas:/volume1/docker/
```

### 5. Deploy on NAS

SSH to NAS:
```bash
ssh admin@nas
cd /volume1/docker/clawdbot

# If using tar.gz:
gunzip -c clawdbot-farmhand.tar.gz | docker load

# Start container
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Synology-Specific Setup

1. **Container Manager** (formerly Docker)
   - Go to Registry → Settings → Add your registry if using private
   - Or use Image → Add → From File to load the tar.gz

2. **Create Container**
   - Image: clawdbot-farmhand
   - Port: 18789:18789
   - Volume: Create folders for persistent data
   - Environment: Add all variables from .env

3. **Task Scheduler** (optional)
   - Create a triggered task to restart on boot
   - Script: `docker start clawdbot-farmhand`

## QNAP-Specific Setup

1. **Container Station**
   - Images → Import → Upload tar.gz
   - Create Container from image
   - Advanced Settings → Environment Variables
   - Network → Port forwarding 18789

## Verify Deployment

1. Check container is running:
   ```bash
   docker ps | grep clawdbot
   ```

2. Check logs:
   ```bash
   docker logs clawdbot-farmhand
   ```

3. Test via Telegram:
   - Send message to @ACTFarmhand_bot
   - Should respond within seconds

## Updating

When you update skills on your Mac:

```bash
# On Mac
cd ~/act-global-infrastructure/clawdbot-docker
./build-for-nas.sh
docker build -t clawdbot-farmhand .
docker save clawdbot-farmhand | gzip > clawdbot-farmhand.tar.gz
scp clawdbot-farmhand.tar.gz admin@nas:/volume1/docker/

# On NAS
cd /volume1/docker/clawdbot
gunzip -c clawdbot-farmhand.tar.gz | docker load
docker-compose down && docker-compose up -d
```

## Troubleshooting

### Bot not responding
- Check container logs: `docker logs clawdbot-farmhand`
- Verify TELEGRAM_BOT_TOKEN is correct
- Ensure only ONE instance running (NAS or Mac, not both)

### Google API errors
- Check GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
- Verify domain-wide delegation in Google Admin Console

### Skills not working
- Verify all environment variables are set
- Check skill files in /root/.clawdbot/skills/

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    NAS                           │
│  ┌────────────────────────────────────────────┐  │
│  │         Docker: clawdbot-farmhand          │  │
│  │                                            │  │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────┐   │  │
│  │  │ Gateway │  │  Skills │  │ CLI Tools │   │  │
│  │  │ :18789  │  │         │  │           │   │  │
│  │  └────┬────┘  └────┬────┘  └─────┬─────┘   │  │
│  │       │            │             │         │  │
│  │       └────────────┴─────────────┘         │  │
│  │                    │                       │  │
│  └────────────────────┼───────────────────────┘  │
│                       │                          │
└───────────────────────┼──────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │    Telegram     │
              │  @ACTFarmhand   │
              └─────────────────┘
```

When Mac is ON: Use local gateway (faster, full features)
When Mac is OFF: NAS takes over via Telegram
