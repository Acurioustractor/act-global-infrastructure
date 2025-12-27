#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

# Run the snapshot script
node scripts/snapshot-sprint-metrics.mjs
