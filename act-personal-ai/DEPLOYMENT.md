# ACT Farmhand API - Deployment Guide

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
cd /Users/benknight/act-global-infrastructure/act-personal-ai

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Add required keys
cat >> .env << 'EOF'
ANTHROPIC_API_KEY=your_anthropic_key_here
FARMHAND_API_KEY=your_secret_api_key_here
EOF
```

### 3. Run Local Server

```bash
# Start FastAPI server
uvicorn api.main:app --reload --port 8000

# Or run directly
python api/main.py
```

### 4. Test API

```bash
# Health check
curl http://localhost:8000/health

# View interactive docs
open http://localhost:8000/docs
```

---

## Deploy to Fly.io (Recommended)

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Or using install script
curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io

```bash
flyctl auth login
```

### 3. Create Fly App

```bash
cd /Users/benknight/act-global-infrastructure/act-personal-ai

# Launch app (creates fly.toml)
flyctl launch

# Follow prompts:
# App name: farmhand-api (or your choice)
# Region: Sydney (syd) for Australia
# Database: No
# Deploy now: No (we'll set secrets first)
```

### 4. Set Environment Secrets

```bash
# Set Anthropic API key
flyctl secrets set ANTHROPIC_API_KEY=your_actual_key_here

# Set Farmhand API key (for authentication)
flyctl secrets set FARMHAND_API_KEY=$(openssl rand -hex 32)

# Save the API key! You'll need it for Empathy Ledger
echo "Your Farmhand API key: $(flyctl secrets list | grep FARMHAND_API_KEY)"
```

### 5. Deploy

```bash
# Deploy to Fly.io
flyctl deploy

# View logs
flyctl logs

# Check status
flyctl status

# Open in browser
flyctl open
```

### 6. Test Production API

```bash
# Health check
curl https://farmhand-api.fly.dev/health

# Test authenticated endpoint
curl -X POST https://farmhand-api.fly.dev/story/check-tone \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "We empower Indigenous communities to share stories."}'
```

---

## Deploy to Railway (Alternative)

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login & Deploy

```bash
cd /Users/benknight/act-global-infrastructure/act-personal-ai

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set ANTHROPIC_API_KEY=your_key_here
railway variables set FARMHAND_API_KEY=$(openssl rand -hex 32)

# Deploy
railway up
```

---

## Integrate with Empathy Ledger

### 1. Add API URL to Empathy Ledger

```bash
cd /Users/benknight/Code/empathy-ledger-v2

# Add to .env.local
echo "FARMHAND_API_URL=https://farmhand-api.fly.dev" >> .env.local
echo "FARMHAND_API_KEY=your_api_key_from_flyctl" >> .env.local
```

### 2. Install Farmhand Client

The TypeScript client library is at:
`/Users/benknight/Code/empathy-ledger-v2/src/lib/farmhand/client.ts`

### 3. Use in Next.js API Routes

```typescript
import { FarmhandClient } from '@/lib/farmhand/client'

const farmhand = new FarmhandClient()

// Calculate SROI
const sroi = await farmhand.calculateSROI({
  project: 'empathy-ledger',
  investment: 50000,
  outcomes: { stories_preserved: 100 }
})

// Analyze narrative
const arc = await farmhand.analyzeNarrativeArc(transcriptText)

// Check tone
const tone = await farmhand.checkToneAlignment(draftText)
```

---

## Monitoring & Maintenance

### View Logs

```bash
# Fly.io logs
flyctl logs

# Railway logs
railway logs
```

### Scale Up/Down

```bash
# Fly.io - scale to 2 instances
flyctl scale count 2

# Railway - auto-scales
```

### Update Deployment

```bash
# Make code changes, then:
flyctl deploy

# Or with Railway:
railway up
```

### Cost

**Fly.io:**
- Free tier: 3 shared-cpu VMs (256MB RAM)
- Paid: ~$5-10/month for dedicated resources

**Railway:**
- Free tier: $5 credit/month
- Paid: Usage-based (~$5-15/month for light usage)

---

## Security Checklist

- [x] API key authentication required
- [x] CORS configured for Empathy Ledger domains only
- [x] HTTPS enforced (automatic with Fly.io/Railway)
- [x] Rate limiting (TODO: add if needed)
- [x] No sensitive data logged

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution**: Check that all agents are in `/agents/` directory:

```bash
ls agents/
# Should show:
# alma_agent.py
# impact_agent.py
# grant_agent.py
# story_analysis_agent.py
# story_writing_agent.py
# ... etc
```

### Issue: "ANTHROPIC_API_KEY not set"

**Solution**: Set environment variable:

```bash
# Fly.io
flyctl secrets set ANTHROPIC_API_KEY=sk-...

# Railway
railway variables set ANTHROPIC_API_KEY=sk-...
```

### Issue: 401 Unauthorized from Empathy Ledger

**Solution**: Check API key matches:

```bash
# Check what's set in Fly.io
flyctl secrets list

# Check what's in Empathy Ledger .env.local
cat /Users/benknight/Code/empathy-ledger-v2/.env.local | grep FARMHAND_API_KEY
```

---

## Next Steps

After deploying Farmhand API:

1. ✅ Deploy API to Fly.io
2. ✅ Test health endpoint
3. ✅ Add API URL to Empathy Ledger `.env.local`
4. ✅ Create Farmhand TypeScript client
5. ✅ Add SROI endpoint to Empathy Ledger
6. ✅ Build SROI dashboard component
7. ✅ Test end-to-end flow

See `/Users/benknight/Code/empathy-ledger-v2/docs/design/ACT_FARMHAND_INTEGRATION.md` for full integration plan.
