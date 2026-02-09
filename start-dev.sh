#!/bin/bash
# ACT Command Center Development Servers
# Run from: /Users/benknight/Code/act-global-infrastructure

set -e

ROOT_DIR="/Users/benknight/Code/act-global-infrastructure"
cd "$ROOT_DIR"

echo "🚀 Starting ACT Command Center..."

# Kill any existing processes
pkill -f "api-server.mjs" 2>/dev/null || true
pkill -f "next dev -p 3001" 2>/dev/null || true
sleep 1

# Start Backend API (from root so it finds .env.local)
echo "📡 Starting Backend API on port 3456..."
cd "$ROOT_DIR"
node packages/act-dashboard/api-server.mjs &
BACKEND_PID=$!
sleep 3

# Verify backend started
if curl -s http://localhost:3456/api/health > /dev/null; then
    echo "✅ Backend running (PID: $BACKEND_PID)"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start Frontend (from app directory)
echo "🖥️  Starting Frontend on port 3001..."
cd "$ROOT_DIR/apps/command-center-v2"
npm run dev &
FRONTEND_PID=$!
sleep 5

# Verify frontend started
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Frontend running (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ACT Command Center Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend:  http://localhost:3001/finance/subscriptions"
echo "Backend:   http://localhost:3456"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
