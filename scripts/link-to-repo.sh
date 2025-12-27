#!/bin/bash

# Link ACT Global Infrastructure to a project repository
# Usage: ./link-to-repo.sh /path/to/project

PROJECT_PATH=$1
GLOBAL_PATH=~/act-global-infrastructure

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: $0 <project-path>"
    echo "Example: $0 '/Users/benknight/Code/Empathy Ledger v.02'"
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Error: Project path does not exist: $PROJECT_PATH"
    exit 1
fi

cd "$PROJECT_PATH"
PROJECT_NAME=$(basename "$PROJECT_PATH")

echo "🔗 Linking ACT Global Infrastructure to: $PROJECT_NAME"
echo ""

# 1. Link GitHub workflows
echo "📋 Step 1: GitHub Workflows"
if [ ! -d ".github/workflows" ]; then
    mkdir -p .github/workflows
    echo "  Created .github/workflows/"
fi

if [ ! -f ".github/workflows/snapshot-sprint.yml" ]; then
    cp "$GLOBAL_PATH/.github/workflows/snapshot-sprint.yml" .github/workflows/
    echo "  ✅ Copied snapshot-sprint.yml"
else
    echo "  ⚠️  snapshot-sprint.yml already exists (skipping)"
fi

# 2. Link Claude skills
echo ""
echo "🤖 Step 2: Claude Code Skills"
mkdir -p .claude/skills/global

for skill in "$GLOBAL_PATH/.claude/skills/"*; do
    skill_name=$(basename "$skill")
    target=".claude/skills/global/$skill_name"

    if [ -L "$target" ] || [ -d "$target" ]; then
        echo "  ⚠️  $skill_name already linked (skipping)"
    else
        ln -s "$skill" "$target"
        echo "  ✅ Linked $skill_name"
    fi
done

# 3. Link scripts (create scripts-global symlink)
echo ""
echo "📜 Step 3: Shared Scripts"
if [ -L "scripts-global" ]; then
    echo "  ⚠️  scripts-global already linked (skipping)"
else
    ln -s "$GLOBAL_PATH/scripts" scripts-global
    echo "  ✅ Linked scripts-global/"
fi

# 4. Check for package.json (needed for workflows)
echo ""
echo "📦 Step 4: Dependencies Check"
if [ ! -f "package.json" ]; then
    echo "  ⚠️  No package.json found - GitHub Actions may fail"
    echo "     Make sure this is a Node.js project with dependencies"
else
    # Check for required dependencies
    if grep -q "@octokit/graphql" package.json && grep -q "@supabase/supabase-js" package.json; then
        echo "  ✅ Required dependencies found"
    else
        echo "  ⚠️  Missing required dependencies:"
        echo "     npm install @octokit/graphql @supabase/supabase-js"
    fi
fi

# 5. Check for .env.local
echo ""
echo "🔐 Step 5: Environment Variables"
if [ ! -f ".env.local" ]; then
    echo "  ⚠️  No .env.local found - create one with:"
    echo "     GITHUB_TOKEN=..."
    echo "     GITHUB_PROJECT_ID=PVT_kwHOCOopjs4BLVik"
    echo "     CURRENT_SPRINT=Backlog"
    echo "     NEXT_PUBLIC_SUPABASE_URL=..."
    echo "     SUPABASE_SERVICE_ROLE_KEY=..."
else
    echo "  ✅ .env.local exists"
fi

echo ""
echo "✅ Linking complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Configure GitHub secrets (if using GitHub Actions)"
echo "  2. Test sprint snapshot: ./scripts-global/run-snapshot.sh"
echo "  3. Use skills: /act-sprint-workflow, /act-brand-alignment, /ghl-crm-advisor"
echo ""
