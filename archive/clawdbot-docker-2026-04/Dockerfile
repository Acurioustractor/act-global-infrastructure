# Clawdbot Docker Image for NAS Deployment
# ACT Farmhand - 24/7 Telegram bot with skills

FROM node:22-slim

# Install dependencies for whisper and general tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install whisper for voice transcription
RUN pip3 install --break-system-packages openai-whisper

# Create app directory
WORKDIR /app

# Install Clawdbot
RUN npm install -g clawdbot@latest || true

# Copy configuration and skills
COPY config/ /root/.clawdbot/
COPY scripts/ /app/scripts/
COPY bin/ /usr/local/bin/

# Make CLI tools executable
RUN chmod +x /usr/local/bin/act-*

# Install Node dependencies for scripts
COPY package.json /app/
RUN npm install

# Expose gateway port
EXPOSE 18789

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:18789/health || exit 1

# Start gateway
CMD ["clawdbot", "gateway", "--port", "18789"]
