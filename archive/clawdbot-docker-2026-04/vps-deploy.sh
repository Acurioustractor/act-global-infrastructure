#!/bin/bash
# Clawdbot VPS Quick Deploy
# Run on a fresh Ubuntu 22.04+ VPS
#
# Usage: curl -sL https://raw.githubusercontent.com/.../vps-deploy.sh | bash
# Or: scp this file to VPS and run: bash vps-deploy.sh

set -e

echo "🌾 Clawdbot Farmhand - VPS Quick Deploy"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo bash vps-deploy.sh)"
  exit 1
fi

# Install Node.js 22
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install Python + FFmpeg for Whisper (optional - for voice)
echo "📦 Installing Python and FFmpeg..."
apt-get install -y python3 python3-pip ffmpeg

# Install Whisper (optional)
echo "🎤 Installing Whisper for voice transcription..."
pip3 install openai-whisper --break-system-packages || true

# Create clawdbot user
echo "👤 Creating clawdbot user..."
useradd -m -s /bin/bash clawdbot || true

# Install Clawdbot
echo "🦞 Installing Clawdbot..."
npm install -g clawdbot@latest

# Create directories
echo "📁 Setting up directories..."
mkdir -p /home/clawdbot/.clawdbot/skills
mkdir -p /home/clawdbot/clawd/voice-notes
chown -R clawdbot:clawdbot /home/clawdbot

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/clawdbot.service << 'EOF'
[Unit]
Description=Clawdbot Farmhand Gateway
After=network.target

[Service]
Type=simple
User=clawdbot
WorkingDirectory=/home/clawdbot
ExecStart=/usr/bin/clawdbot gateway --port 18789
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable clawdbot

echo ""
echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy your config file:"
echo "   scp ~/.clawdbot/clawdbot.json root@YOUR_VPS:/home/clawdbot/.clawdbot/"
echo ""
echo "2. Copy skills:"
echo "   scp -r ~/.clawdbot/skills/* root@YOUR_VPS:/home/clawdbot/.clawdbot/skills/"
echo ""
echo "3. Create environment file with secrets:"
echo "   nano /home/clawdbot/.clawdbot/.env"
echo ""
echo "4. Fix ownership:"
echo "   chown -R clawdbot:clawdbot /home/clawdbot/.clawdbot"
echo ""
echo "5. Start the service:"
echo "   systemctl start clawdbot"
echo ""
echo "6. Check logs:"
echo "   journalctl -u clawdbot -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
