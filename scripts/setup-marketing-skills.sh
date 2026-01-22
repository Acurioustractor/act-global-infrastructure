#!/bin/bash
# Setup Marketing Skills for ACT Projects
# Run this from any ACT project root to add marketing skills
#
# Usage: curl -s https://raw.githubusercontent.com/.../setup-marketing-skills.sh | bash
# Or:    bash /path/to/act-global-infrastructure/scripts/setup-marketing-skills.sh

set -e

echo "🎯 Setting up Marketing Skills for Claude Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create .claude directory if needed
mkdir -p .claude/skills

# Add marketingskills as submodule (or update if exists)
if [ -d ".claude/marketingskills" ]; then
  echo "📦 Marketing skills already installed, updating..."
  cd .claude/marketingskills && git pull && cd ../..
else
  echo "📥 Installing marketingskills submodule..."
  git submodule add https://github.com/coreyhaines31/marketingskills.git .claude/marketingskills 2>/dev/null || true
fi

# Create symlinks for key skills
cd .claude/skills

SKILLS=(
  "copywriting"
  "copy-editing"
  "email-sequence"
  "page-cro"
  "seo-audit"
  "analytics-tracking"
  "social-content"
  "launch-strategy"
  "marketing-psychology"
  "pricing-strategy"
  "programmatic-seo"
  "referral-program"
  "form-cro"
  "onboarding-cro"
)

echo ""
echo "🔗 Creating skill symlinks..."
for skill in "${SKILLS[@]}"; do
  if [ -d "../marketingskills/skills/$skill" ]; then
    ln -sf "../marketingskills/skills/$skill" "marketing-$skill" 2>/dev/null || true
    echo "   ✓ marketing-$skill"
  fi
done

cd ../..

echo ""
echo "✅ Marketing skills installed!"
echo ""
echo "Available commands:"
echo "  /marketing-copywriting     - Write marketing copy"
echo "  /marketing-email-sequence  - Create email sequences"
echo "  /marketing-page-cro        - Optimize page conversions"
echo "  /marketing-seo-audit       - Audit SEO"
echo "  /marketing-launch-strategy - Plan launches"
echo "  /marketing-social-content  - Create social content"
echo ""
echo "Or just describe what you need - Claude will use the right skill."
