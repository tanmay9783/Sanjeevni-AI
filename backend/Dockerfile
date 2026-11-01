FROM node:22-slim

# Install ffmpeg, unzip, and native build toolchain (python3, make, g++) for native addons (better-sqlite3, bcrypt)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    unzip \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Rhubarb Lip Sync — MUST keep the full folder intact.
# The binary looks for ./res/sphinx/acoustic-model/ RELATIVE to its own location.
# So we extract everything to /opt/ and point RHUBARB_PATH at the binary inside.
RUN wget -q https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip \
    -O /tmp/rhubarb.zip \
    && unzip /tmp/rhubarb.zip -d /opt/ \
    && chmod +x /opt/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb \
    && rm /tmp/rhubarb.zip

ENV RHUBARB_PATH=/opt/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .

# Ensure audios folder exists at runtime
RUN mkdir -p audios

# Start the app using shell form so $PORT is correctly interpreted
CMD node index.js
