#!/usr/bin/env bash
# Weekly BAS hygiene cron — runs the 4 pieces that keep the receipt system
# self-maintaining and alerts on failures.
#
# What it does:
#   1. Sync Xero mirror from Xero (catches new transactions)
#   2. Run Gmail → Xero pipeline on last 14 days of still-missing txns
#   3. Run BAS completeness classifier (threshold alert if coverage drops)
#   4. Run Xero token health check (alerts on auth issues)
#
# Usage:
#   ./scripts/cron-weekly-bas.sh                    # manual run
#   ./scripts/cron-weekly-bas.sh --quiet            # suppress success output
#
# PM2 registration:
#   pm2 start scripts/cron-weekly-bas.sh --name bas-weekly --cron "0 6 * * 0" --no-autorestart
#   pm2 save
#
# Alert channel: set ALERT_WEBHOOK (Slack incoming webhook URL) or ALERT_EMAIL
# in .env.local to receive failure notifications. If neither is set, failures
# are logged to ~/.gstack/cron-bas.log and silently exit non-zero.

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1

LOG_DIR="$HOME/.gstack"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cron-bas.log"
QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

log() {
  local msg="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
  echo "$msg" >> "$LOG_FILE"
  [[ $QUIET -eq 0 ]] && echo "$msg"
}

alert() {
  local level="$1"  # ERROR | WARN
  local subject="$2"
  local body="$3"

  log "[$level] $subject"
  log "$body"

  # Slack webhook
  if [[ -n "${ALERT_WEBHOOK:-}" ]]; then
    curl -sS -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"*BAS cron $level:* $subject\\n\`\`\`$body\`\`\`\"}" \
      "$ALERT_WEBHOOK" >> "$LOG_FILE" 2>&1 || true
  fi

  # Email via macOS `mail` command if available
  if [[ -n "${ALERT_EMAIL:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo "$body" | mail -s "BAS cron $level: $subject" "$ALERT_EMAIL" || true
  fi
}

log "=== Weekly BAS cron starting ==="

# ---- 1. Token health check (run first — everything downstream needs valid tokens)
log "Step 1: Xero token health"
TOKEN_OUT=$(node scripts/sync-xero-tokens.mjs --dry-run 2>&1) || {
  alert ERROR "Xero token health check failed" "$TOKEN_OUT"
  exit 1
}
log "  ✅ Token health OK"

# ---- 2. Sync Xero → Supabase mirror
log "Step 2: Sync Xero → Supabase"
SYNC_OUT=$(node scripts/sync-xero-to-supabase.mjs 2>&1) || {
  alert ERROR "Xero → Supabase sync failed" "$(echo "$SYNC_OUT" | tail -20)"
  exit 1
}
log "  ✅ Sync complete"

# ---- 3. Gmail → Xero pipeline (auto-pushes new receipts)
log "Step 3: Gmail → Xero pipeline (last 14 days)"
PIPELINE_OUT=$(node scripts/gmail-to-xero-pipeline.mjs Q2 Q3 --apply 2>&1) || {
  alert WARN "Gmail → Xero pipeline had errors" "$(echo "$PIPELINE_OUT" | tail -15)"
  # Non-fatal — continue
}
log "  Pipeline finished (see log for details)"

# ---- 4. BAS completeness classifier + threshold alert
log "Step 4: BAS completeness check"
COMPLETENESS_OUT=$(node scripts/bas-completeness.mjs Q2 Q3 2>&1) || {
  alert ERROR "Completeness classifier failed" "$(echo "$COMPLETENESS_OUT" | tail -20)"
  exit 1
}

# Parse the "by value" percentage from the output
COVERAGE_VALUE=$(echo "$COMPLETENESS_OUT" | grep -oE '[0-9]+\.[0-9]+% by value' | head -1 | grep -oE '[0-9]+\.[0-9]+' || echo "0")
COVERAGE_THRESHOLD=90.0

# Use awk for float comparison (bash lacks native float comparison)
BELOW_THRESHOLD=$(awk "BEGIN { print ($COVERAGE_VALUE < $COVERAGE_THRESHOLD) }")

if [[ "$BELOW_THRESHOLD" == "1" ]]; then
  alert ERROR "BAS coverage dropped below ${COVERAGE_THRESHOLD}%" "Current value coverage: ${COVERAGE_VALUE}%

Run manually to investigate:
  node scripts/bas-completeness.mjs Q2 Q3

Recent pipeline log:
$(tail -30 "$LOG_FILE")"
  exit 1
fi

log "  ✅ Coverage OK: ${COVERAGE_VALUE}% by value"
log "=== Weekly BAS cron complete ==="

# Success notification (optional — only if ALERT_WEBHOOK set and VERBOSE mode)
if [[ -n "${ALERT_WEBHOOK:-}" && "${VERBOSE:-}" == "true" ]]; then
  curl -sS -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ BAS weekly cron: ${COVERAGE_VALUE}% coverage\"}" \
    "$ALERT_WEBHOOK" >> "$LOG_FILE" 2>&1 || true
fi

exit 0
