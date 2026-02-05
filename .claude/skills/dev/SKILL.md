---
name: dev
description: Start local development environment — dev servers, tunnels for webhook testing, health checks, and log tailing. Use when user says "start dev", "local dev", "spin up", "test locally", "tunnel", or wants to test webhooks.
---

# Local Dev Skill

Start the full local development stack with optional tunnel for webhook testing.

## Quick Commands

| Command | What it does |
|---------|-------------|
| `/dev` or `/dev start` | Start dev servers (dashboard + API) |
| `/dev all` | Start everything (servers + cron scripts) |
| `/dev tunnel` | Start servers + cloudflared tunnel for webhook testing |
| `/dev status` | Check what's running |
| `/dev stop` | Stop everything |
| `/dev logs` | Tail recent logs |

## Workflow: Start Dev

### Step 1: Check Prerequisites

```bash
# Check node, pnpm, pm2
node --version && pnpm --version && pm2 --version 2>/dev/null || echo "MISSING: install pm2 globally"
```

If pm2 is missing: `npm install -g pm2`

### Step 2: Start Dev Servers

```bash
cd /Users/benknight/Code/act-global-infrastructure
./dev start
```

This starts via PM2:
- **act-frontend**: Next.js on `http://localhost:3001`
- **act-api**: API server on `http://localhost:3456`

### Step 3: Verify

```bash
# Wait for servers to be ready
sleep 5

# Check frontend
curl -s -o /dev/null -w "Dashboard: %{http_code}\n" http://localhost:3001/

# Check API
curl -s -o /dev/null -w "API: %{http_code}\n" http://localhost:3456/api/health 2>/dev/null || echo "API: standalone API not needed (Next.js API routes handle it)"

# PM2 status
pm2 status
```

### Step 4: Report

```
Local dev environment ready:
- Dashboard: http://localhost:3001
- API routes: http://localhost:3001/api/...
```

## Workflow: Tunnel (for webhook testing)

Use this when testing Telegram bot, GHL webhooks, or Xero webhooks locally.

### Step 1: Start Dev Servers (same as above)

### Step 2: Start Cloudflared Tunnel

IMPORTANT: Use `--config /dev/null` to avoid the catch-all 404 from existing config.yml.

```bash
cloudflared tunnel --config /dev/null --url http://localhost:3001 2>&1 &
```

Wait a few seconds, then grab the tunnel URL from the output (looks like `https://something-random.trycloudflare.com`).

### Step 3: Set Telegram Webhook (if testing bot)

```bash
TUNNEL_URL="<the cloudflared URL>"
TELEGRAM_BOT_TOKEN="<from .env.local>"

curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${TUNNEL_URL}/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET from .env.local>"
```

Verify:
```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool
```

### Step 4: Report

```
Tunnel active:
- Public URL: <tunnel URL>
- Telegram webhook: set to <tunnel URL>/api/telegram/webhook
- Test by sending a message to the bot
```

### Step 5: Cleanup (when done)

IMPORTANT: Reset webhook to production URL when done testing locally.

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://command.act.place/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Kill the tunnel:
```bash
pkill -f cloudflared 2>/dev/null
```

## Workflow: Start Cron Scripts

```bash
cd /Users/benknight/Code/act-global-infrastructure
./dev cron
```

This starts PM2 cron jobs:
- `notion-sync` — every 5 min
- `imessage-sync` — every 15 min
- `daily-briefing` — 7am AEST
- `knowledge-pipeline` — 8am AEST
- `data-freshness` — every 6h
- Plus: storyteller sync/link, embed-imessages, detect-episodes, agent-learning, meeting-sync

## Workflow: Status & Logs

```bash
# Status of all PM2 processes
pm2 status

# Tail all logs
pm2 logs --lines 50

# Tail specific service
pm2 logs act-frontend --lines 30

# Check for errors
pm2 logs --err --lines 20
```

## Workflow: Stop

```bash
# Stop dev servers only
./dev stop

# Stop cron scripts only
./dev stop-cron

# Stop everything
pm2 stop all
```

## Ports & URLs

| Service | Local URL | Production URL |
|---------|-----------|---------------|
| Dashboard | `http://localhost:3001` | `https://command.act.place` |
| API routes | `http://localhost:3001/api/*` | `https://command.act.place/api/*` |
| Legacy API | `http://localhost:3456` | (deprecated) |
| Telegram webhook | `/api/telegram/webhook` | same path |
| GHL webhook | `/api/webhooks/ghl` | same path |
| Xero webhook | `/api/webhooks/xero` | same path |

## Common Issues

| Issue | Fix |
|-------|-----|
| Port 3001 already in use | `lsof -i :3001` then `kill <PID>` |
| PM2 not found | `npm install -g pm2` |
| Cloudflared tunnel 404 | Use `--config /dev/null` flag |
| Telegram webhook not receiving | Check `getWebhookInfo`, verify secret matches |
| Env vars not loaded | Check `.env.local` exists in project root |
| Next.js build errors | Run `npx tsc --noEmit` in `apps/command-center/` first |

## Environment Checklist

These env vars must be in `.env.local` for full local dev:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

**For Telegram bot testing:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_AUTHORIZED_USERS`

**For email/calendar:**
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_DELEGATED_USERS`
- `GOOGLE_CALENDAR_ID`

**For finance:**
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID`, `XERO_REFRESH_TOKEN`
