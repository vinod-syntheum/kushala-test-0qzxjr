# syntax=docker/dockerfile:1.4

# Build stage
FROM node:18-alpine AS builder

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_SHARP_PATH=/app/node_modules/sharp

# Set working directory
WORKDIR /app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files with strict permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node next.config.ts ./
COPY --chown=node:node postcss.config.ts ./

# Install dependencies with npm ci and audit
RUN npm ci --only=production && \
    npm audit fix && \
    npm cache clean --force

# Copy source code with appropriate ownership
COPY --chown=node:node . .

# Build production application with optimizations
RUN npm run build && \
    npm prune --production

# Verify build artifacts
RUN test -d .next && \
    test -d node_modules && \
    test -f package.json && \
    test -f next.config.ts

# Production stage
FROM node:18-alpine AS runner

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_SHARP_PATH=/app/node_modules/sharp

# Create non-root user and group
RUN addgroup --system --gid 1001 nextjs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app && \
    chown -R nextjs:nextjs /app

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules

# Configure security policies and limits
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/* && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nextjs /app/.next/cache

# Set up health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set resource limits
LABEL maintainer="Digital Presence Team" \
      version="1.0.0" \
      description="Frontend container for Digital Presence Platform" \
      org.opencontainers.image.source="https://github.com/organization/digital-presence" \
      org.opencontainers.image.licenses="MIT"

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Configure volume for build cache
VOLUME ["/app/.next/cache"]

# Start Next.js production server
CMD ["npm", "start"]