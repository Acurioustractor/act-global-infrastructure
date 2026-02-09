---
name: deploy
description: Deploy to Vercel with pre-flight checks, env var parity, build verification, and post-deploy health checks. Use when user says "deploy", "push to production", "ship it", or after completing a feature.
---

# Deploy Skill

Standardised deployment workflow that catches issues BEFORE they hit production.

## Workflow

Execute these steps sequentially. Stop and report if any step fails.

### Step 1: Pre-flight — Build Check

```bash
cd apps/command-center && npx tsc --noEmit 2>&1 | head -30
```

If there are TypeScript errors, fix them before proceeding. Do NOT skip this step.

### Step 2: Pre-flight — Git Status

```bash
git status
git log --oneline -5
```

- Check for uncommitted changes that should be committed first
- Confirm we're on the right branch
- If there are unstaged changes, ask the user if they want to commit first

### Step 3: Pre-flight — Env Var Parity

Compare local `.env.local` keys against Vercel environment variables:

```bash
# Get local env var names (excluding comments and empty lines)
grep -E '^[A-Z_]+=.' .env.local | cut -d= -f1 | sort > /tmp/local-env-keys.txt

# Get Vercel env vars
npx vercel env ls production 2>/dev/null | grep -E '^\w' | awk '{print $1}' | sort > /tmp/vercel-env-keys.txt

# Show differences
diff /tmp/local-env-keys.txt /tmp/vercel-env-keys.txt
```

- Report any env vars that exist locally but NOT in Vercel (potential missing config)
- Report any env vars in Vercel but NOT locally (potential stale config)
- For NEW env vars added in this session, remind the user to add them to Vercel

### Step 4: Push to Remote

```bash
git push origin HEAD
```

If the push fails (e.g., remote has changes), report the error. Do NOT force push.

### Step 5: Deploy

```bash
npx vercel --prod
```

Capture the deployment URL from the output.

### Step 6: Post-deploy — Health Checks

Hit key endpoints to verify the deployment:

```bash
# Main app
curl -s -o /dev/null -w "%{http_code}" https://act-global-infrastructure.vercel.app/

# API health
curl -s -o /dev/null -w "%{http_code}" https://act-global-infrastructure.vercel.app/api/health

# Telegram webhook (should return 200 or method not allowed)
curl -s -o /dev/null -w "%{http_code}" https://act-global-infrastructure.vercel.app/api/telegram/webhook
```

Report status codes. If any return 5xx, investigate immediately.

### Step 7: Summary

Report:
- Deployment URL
- Health check results
- Any env var discrepancies found
- Any warnings or follow-up actions needed

## Vercel Project Context

- **Project**: command-center (apps/command-center)
- **Team**: Check with `npx vercel whoami`
- **Production URL**: act-global-infrastructure.vercel.app (future: goodsoncountry.com)
- **Framework**: Next.js (App Router)

## Common Issues

| Issue | Fix |
|-------|-----|
| Wrong Vercel project linked | Run `npx vercel link` in `apps/command-center/` |
| Build fails on Vercel but not locally | Check Node.js version parity, check env vars exist in Vercel |
| Missing env var on Vercel | `npx vercel env add VARNAME production` |
| Webhook not working after deploy | Verify TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are set |
| Deployment URL changed | Update webhook URL with Telegram Bot API |

## Rollback

If the deployment is broken:

```bash
npx vercel rollback
```

This reverts to the previous successful deployment immediately.
