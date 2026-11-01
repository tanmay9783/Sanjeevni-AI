# Multi-stage Dockerfile for Sanjeevni AI 3D Avatar Kiosk Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build Vite React SPA
RUN npm run build

# Production runtime image using serve
FROM node:20-alpine

WORKDIR /app

# Install lightweight static server
RUN npm install -g serve

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist

# Expose Kiosk port
EXPOSE 5173

# Serve on 5173 with SPA routing fallback
CMD ["serve", "-s", "dist", "-l", "5173"]

