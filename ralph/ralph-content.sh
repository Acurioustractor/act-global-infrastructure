#!/bin/bash
# Ralph Content - Automated Content Generation Runner
# Generates social content from ACT ecosystem knowledge

set -e

# Configuration
PROJECT_DIR=${PROJECT_DIR:-"/Users/benknight/act-global-infrastructure"}
CONTENT_SCRIPT="scripts/generate-content-from-knowledge.mjs"
MAX_POSTS=${MAX_POSTS:-3}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Ralph Content - Ecosystem Publishing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Check environment
if [ -z "$NOTION_TOKEN" ]; then
    echo -e "${YELLOW}Warning: NOTION_TOKEN not set${NC}"
    echo "Content will be generated but not created in Notion."
    echo "Running in dry-run mode..."
    echo ""
    DRY_RUN="--dry-run"
else
    DRY_RUN=""
fi

# Parse arguments
CONTENT_TYPE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            CONTENT_TYPE="--type $2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --max)
            MAX_POSTS=$2
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "Project: ${GREEN}$PROJECT_DIR${NC}"
echo -e "Max Posts: ${GREEN}$MAX_POSTS${NC}"
echo -e "Content Type: ${GREEN}${CONTENT_TYPE:-all}${NC}"
echo ""

# Run content generation
echo -e "${BLUE}Running content generation...${NC}"
echo ""

node "$CONTENT_SCRIPT" $CONTENT_TYPE $DRY_RUN --max "$MAX_POSTS"

# Log completion
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Content Generation Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Timestamp: $TIMESTAMP"
echo ""

# If not dry-run, provide next steps
if [ -z "$DRY_RUN" ] || [ "$DRY_RUN" != "--dry-run" ]; then
    echo "Next steps:"
    echo "1. Review drafts in Notion Content Hub"
    echo "2. Edit content and add images"
    echo "3. Change status to 'Ready to Connect'"
    echo "4. Run: node scripts/sync-content-to-ghl.mjs"
    echo ""
fi

# Optional: Log to progress file
PROGRESS_FILE="ralph/progress.txt"
if [ -f "$PROGRESS_FILE" ]; then
    echo "[$TIMESTAMP] content-generation: Ran ecosystem content generation" >> "$PROGRESS_FILE"
fi
