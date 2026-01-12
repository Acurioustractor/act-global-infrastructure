#!/bin/bash

# ACT Ecosystem - Production-Quality Local Deployment
# Uses PM2 for process management + AppleScript for browser automation
#
# Usage:
#   ./scripts/deploy-act-ecosystem.sh start   # Start all servers
#   ./scripts/deploy-act-ecosystem.sh stop    # Stop all servers
#   ./scripts/deploy-act-ecosystem.sh restart # Restart all servers
#   ./scripts/deploy-act-ecosystem.sh status  # Show status
#   ./scripts/deploy-act-ecosystem.sh logs    # Show logs
#   ./scripts/deploy-act-ecosystem.sh monitor # Open dashboard

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ECOSYSTEM_CONFIG="$PROJECT_ROOT/ecosystem.config.cjs"
APPLESCRIPT="$SCRIPT_DIR/open-all-sites.applescript"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Functions
print_header() {
    echo -e "${BOLD}${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   ACT Ecosystem Deployment Manager    ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed!"
        echo "Installing PM2 globally..."
        npm install -g pm2
        print_success "PM2 installed"
    fi
}

wait_for_servers() {
    echo ""
    print_info "Waiting for servers to start..."
    sleep 8
    echo ""
}

open_browser() {
    print_info "Opening all sites in Chrome..."
    osascript "$APPLESCRIPT" 2>/dev/null &
    print_success "Sites opened in browser"
}

show_status() {
    echo ""
    pm2 list
    echo ""
    print_info "Individual site URLs:"
    echo "  🌐 ACT Regenerative Studio:  http://localhost:3002"
    echo "  📖 Empathy Ledger:           http://localhost:3030"
    echo "  ⚖️  JusticeHub:               http://localhost:3003"
    echo "  🌾 The Harvest Website:      http://localhost:3004"
    echo "  🚜 ACT Farm:                 http://localhost:3005"
    echo "  🗂️  ACT Placemat:             http://localhost:3999"
    echo ""
}

start_servers() {
    print_header
    check_pm2

    # Stop any existing PM2 processes
    if pm2 list | grep -q "act-studio"; then
        print_warning "Existing processes found, stopping them first..."
        pm2 delete all 2>/dev/null || true
    fi

    print_info "Starting all ACT ecosystem servers..."
    cd "$PROJECT_ROOT"
    pm2 start "$ECOSYSTEM_CONFIG"

    print_success "All servers started with PM2"

    wait_for_servers
    open_browser
    show_status

    echo -e "${BOLD}${GREEN}🎉 ACT Ecosystem is now running!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  pm2 logs          - View all logs in real-time"
    echo "  pm2 monit         - Open interactive dashboard"
    echo "  pm2 list          - Show all processes"
    echo "  pm2 restart all   - Restart all servers"
    echo "  pm2 stop all      - Stop all servers"
    echo ""
}

stop_servers() {
    print_header
    print_info "Stopping all ACT ecosystem servers..."
    pm2 delete all 2>/dev/null || true
    print_success "All servers stopped"
}

restart_servers() {
    print_header
    print_info "Restarting all ACT ecosystem servers..."
    pm2 restart all
    print_success "All servers restarted"
    wait_for_servers
    show_status
}

show_logs() {
    print_header
    echo "Showing live logs from all servers..."
    echo "Press Ctrl+C to exit"
    echo ""
    pm2 logs
}

show_monitor() {
    print_header
    echo "Opening PM2 monitoring dashboard..."
    echo "Press Ctrl+C to exit"
    echo ""
    pm2 monit
}

# Main command handling
case "${1:-start}" in
    start)
        start_servers
        ;;
    stop)
        stop_servers
        ;;
    restart)
        restart_servers
        ;;
    status)
        print_header
        show_status
        ;;
    logs)
        show_logs
        ;;
    monitor|monit|dash|dashboard)
        show_monitor
        ;;
    *)
        print_header
        print_error "Unknown command: $1"
        echo ""
        echo "Usage:"
        echo "  $0 start      - Start all servers"
        echo "  $0 stop       - Stop all servers"
        echo "  $0 restart    - Restart all servers"
        echo "  $0 status     - Show server status"
        echo "  $0 logs       - Show live logs"
        echo "  $0 monitor    - Open monitoring dashboard"
        exit 1
        ;;
esac
