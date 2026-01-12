# Deploy GHL Webhook

Deploy or redeploy the GHL webhook edge function and verify it's working.

## Pre-flight Checks

```bash
# Check Supabase CLI is available
supabase --version

# Check we're linked to the right project
cd /Users/benknight/act-global-infrastructure && supabase projects list
```

## Deploy the Edge Function

```bash
cd /Users/benknight/act-global-infrastructure

# Set the GHL_LOCATION_ID secret
supabase secrets set GHL_LOCATION_ID=agzsSZWgovjwgpcoASWG

# Deploy the function
supabase functions deploy ghl-webhook --project-ref tednluwflfhxyucgwigh
```

## Webhook URL

After deployment, the webhook URL is:
```
https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook
```

## Test the Webhook

```bash
# Send a test contact create event
curl -X POST "https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ContactCreate",
    "data": {
      "contact": {
        "id": "test-deploy-'$(date +%s)'",
        "firstName": "Deploy",
        "lastName": "Test",
        "email": "deploy-test@example.com",
        "tags": ["Test"]
      }
    }
  }'
```

## Verify in Supabase

```bash
# Check the sync log for the test
cd /Users/benknight/act-personal-ai && \
SUPABASE_SHARED_SERVICE_ROLE_KEY="$(BWS_ACCESS_TOKEN="0.ed48207d-a91e-4fe0-b8d3-b3c9002ffcf0.6if60X121Gaep8SVZ7oxlWSR89izhg:E02XykExIUGrNYdajpkaFA==" ~/bin/bws secret get SUPABASE_SHARED_SERVICE_ROLE_KEY --project-id 76eb7171-fb00-479f-b092-b3c900301ebb -o json 2>/dev/null | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).value")" \
node scripts/ghl-stats.mjs
```

## Clean Up Test Data

```bash
# Remove test contacts
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY
);
supabase.from('ghl_contacts').delete().like('ghl_id', 'test-deploy%').then(console.log);
"
```

## Configure in GHL

After deployment, add the webhook URL in GHL:
1. GHL → Settings → Webhooks
2. Add: `https://tednluwflfhxyucgwigh.supabase.co/functions/v1/ghl-webhook`
3. Enable: Contact Create, Contact Update, Contact Delete, Opportunity events

## Output

After running this command, report:
1. Deployment status (success/fail)
2. Test webhook response
3. Sync log verification
4. Next steps for GHL configuration
