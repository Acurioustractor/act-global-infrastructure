# Deploy v0.1 - Simple Instructions
**Updated:** 2026-01-01

The automated script needs updates for the latest OpenAI API. Here's the simplest way to deploy v0.1:

---

## ✅ Option 1: OpenAI Web Dashboard (Recommended - 5 minutes)

### Step 1: Upload Training File
1. Go to https://platform.openai.com/finetune
2. Click **"Create"** button
3. Click **"Upload file"** and select:
   ```
   /Users/benknight/act-global-infrastructure/training-data/act-voice-training-dataset-v2-2026-01-01.jsonl
   ```
4. Wait for upload to complete (~10 seconds)

### Step 2: Create Fine-tuning Job
1. **Base model:** Select `gpt-4o-mini-2024-07-18`
2. **Training file:** (should auto-select your uploaded file)
3. **Suffix:** Enter `act-voice-v0-1`
4. **Hyperparameters:**
   - Epochs: `3` (default is fine)
   - Batch size: Auto
   - Learning rate multiplier: Auto
5. Click **"Create fine-tuning job"**

### Step 3: Monitor Progress
- The dashboard will show training progress
- Takes 10-30 minutes typically
- You'll get email when complete
- Model ID will be: `gpt-4o-mini-2024-07-18:act-voice-v0-1`

### Step 4: Test When Ready
```python
# Python example
from openai import OpenAI
client = OpenAI(api_key="your-key")

response = client.chat.completions.create(
    model="gpt-4o-mini-2024-07-18:act-voice-v0-1",
    messages=[
        {"role": "user", "content": "What does Listen mean in ACT's LCAA methodology?"}
    ]
)

print(response.choices[0].message.content)
```

---

## Option 2: OpenAI CLI (Alternative)

### Install CLI
```bash
pip install openai
```

### Upload & Create Job
```bash
# Set API key
export OPENAI_API_KEY="sk-proj-N3Mv..."

# Upload file
openai api files.create \
  -f /Users/benknight/act-global-infrastructure/training-data/act-voice-training-dataset-v2-2026-01-01.jsonl \
  -p fine-tune

# Note the file ID returned (e.g., file-abc123)

# Create fine-tuning job
openai api fine_tuning.jobs.create \
  -t file-abc123 \
  -m gpt-4o-mini-2024-07-18 \
  --suffix act-voice-v0-1

# Monitor
openai api fine_tuning.jobs.get -i ftjob-abc123
```

---

## Option 3: Simple Python Script

Create `deploy-simple.py`:

```python
#!/usr/bin/env python3
import openai
import os
import time

# Set API key
openai.api_key = "OPENAI_KEY_REMOVED"

# Upload training file
print("📤 Uploading training file...")
with open("/Users/benknight/act-global-infrastructure/training-data/act-voice-training-dataset-v2-2026-01-01.jsonl", "rb") as f:
    file_response = openai.File.create(file=f, purpose='fine-tune')

file_id = file_response['id']
print(f"✅ File uploaded: {file_id}")

# Create fine-tuning job
print("🚀 Creating fine-tuning job...")
job_response = openai.FineTuningJob.create(
    training_file=file_id,
    model="gpt-4o-mini-2024-07-18",
    suffix="act-voice-v0-1",
    hyperparameters={"n_epochs": 3}
)

job_id = job_response['id']
print(f"✅ Job created: {job_id}")
print(f"📊 Status: {job_response['status']}")
print("\nMonitor at: https://platform.openai.com/finetune")
print("Takes 10-30 minutes typically")
```

Run it:
```bash
python3 deploy-simple.py
```

---

## 🧪 Testing v0.1 (After Training Completes)

### Test Queries from Deployment Guide

1. **LCAA Methodology**
   ```
   Q: What does Listen mean in ACT's LCAA methodology?
   Expected: Deep listening to Country, Traditional Owners, Community, etc.
   ```

2. **Project Knowledge**
   ```
   Q: How did Curiosity shape the Empathy Ledger platform?
   Expected: Specific questions explored, prototypes, what was learned
   ```

3. **Voice & Tone**
   ```
   Q: Tell me about ACT's approach to community partnerships
   Expected: Community-centered, power transfer, 40% profit-sharing
   ```

Compare base `gpt-4o-mini` vs fine-tuned `gpt-4o-mini:act-voice-v0-1`

---

## 📊 What You're Deploying

- **Dataset:** 90 examples
- **Quality:** 88/100
- **Cost:** ~$0.23 training
- **LCAA:** Listen (36%), Curiosity (27%), Action (53%), Art (16%)
- **Pillars:** 83% coverage (5 of 6)
- **Voice:** Strong community-centered, good LCAA language

---

## ⚠️ Known Limitations (v0.1)

Will improve in v1.0 with Session 3:
- Art phase under-represented (only 14 examples)
- Art of Social Impact pillar missing
- Regenerative metaphors only 28%

---

## 🎯 Next Steps After Deployment

1. **Test immediately** with queries above
2. **Document feedback** - what works, what doesn't
3. **Share with team** - get multiple perspectives
4. **Compare to baseline** - is it better than base model?
5. **Identify v1.0 priorities** - what needs improvement

---

## 🆘 Need Help?

- **OpenAI Dashboard:** https://platform.openai.com/finetune
- **API Docs:** https://platform.openai.com/docs/guides/fine-tuning
- **Troubleshooting:** Check [V0.1_DEPLOYMENT_GUIDE.md](training-data/V0.1_DEPLOYMENT_GUIDE.md)

---

**Recommendation:** Use Option 1 (Web Dashboard) - it's the fastest and most reliable!

Once v0.1 is training, we'll complete Session 3 for v1.0.
