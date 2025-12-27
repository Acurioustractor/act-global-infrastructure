#!/bin/bash

# Get the directory where this script lives (global infrastructure)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables from .env.local in current directory (the repo)
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Run the snapshot script from global infrastructure
node "$SCRIPT_DIR/snapshot-sprint-metrics.mjs"
