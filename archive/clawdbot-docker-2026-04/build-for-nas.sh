#!/bin/bash
# Build Clawdbot Docker image for NAS deployment
# Run from: ~/act-global-infrastructure/clawdbot-docker/

set -e

echo "🌾 Building Clawdbot Farmhand for NAS deployment..."

# Create build directories
mkdir -p config/skills bin scripts

# Copy Clawdbot config (sanitized - no secrets)
echo "📋 Copying configuration..."
cat ~/.clawdbot/clawdbot.json | \
  jq 'del(.providers.telegram.botToken)' > config/clawdbot.json

# Copy skills
echo "🛠️  Copying skills..."
cp -r ~/.clawdbot/skills/* config/skills/ 2>/dev/null || true

# Copy SOUL.md and workspace files
echo "📖 Copying workspace files..."
mkdir -p config/workspace
cp ~/clawd/SOUL.md config/workspace/ 2>/dev/null || true
cp ~/clawd/AGENTS.md config/workspace/ 2>/dev/null || true
cp ~/clawd/PROJECTS.md config/workspace/ 2>/dev/null || true

# Copy CLI scripts
echo "📜 Copying CLI scripts..."
cp ~/act-global-infrastructure/scripts/act-*.mjs scripts/

# Create wrapper scripts for bin
echo "🔧 Creating CLI wrappers..."
for script in scripts/act-*.mjs; do
  name=$(basename "$script" .mjs)
  cat > "bin/$name" << EOF
#!/bin/bash
cd /app
node scripts/${name}.mjs "\$@"
EOF
done

# Export secrets from Bitwarden to .env (optional - requires manual review)
if command -v bws &> /dev/null; then
  echo "🔐 Exporting secrets template..."
  echo "# Auto-generated - review before using" > .env.generated

  BWS_TOKEN=$(security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null)
  if [ -n "$BWS_TOKEN" ]; then
    secrets=$(BWS_ACCESS_TOKEN="$BWS_TOKEN" ~/bin/bws secret list --output json 2>/dev/null)

    # Extract specific secrets we need
    echo "$secrets" | jq -r '.[] | select(.key | test("TELEGRAM|ANTHROPIC|GOOGLE|NOTION|SUPABASE|GHL")) | "# \(.key)=<from-bitwarden>"' >> .env.generated
  fi

  echo "⚠️  Review .env.generated and copy values to .env"
fi

echo ""
echo "✅ Build preparation complete!"
echo ""
echo "Next steps:"
echo "  1. Review and create .env file with secrets"
echo "  2. Build image: docker build -t clawdbot-farmhand ."
echo "  3. Push to NAS or registry: docker save clawdbot-farmhand | gzip > clawdbot.tar.gz"
echo "  4. On NAS: docker load < clawdbot.tar.gz"
echo "  5. On NAS: docker-compose up -d"
echo ""
