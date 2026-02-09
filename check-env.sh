#!/bin/bash
vars=("REPO_ACT_STUDIO" "REPO_EMPATHY_LEDGER" "REPO_HARVEST" "SUPABASE_PASSWORD" "NOTION_TOKEN" "GHL_API_KEY")
for v in "${vars[@]}"; do
  if [ -z "${!v}" ]; then
    echo "MISSING: $v"
  else
    val="${!v}"
    echo "$v: ${val:0:20}..."
  fi
done
