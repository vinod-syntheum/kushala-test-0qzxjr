# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build essentials
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files for layer caching
COPY src/backend/package*.json ./
COPY src/backend/tsconfig.json ./

# Install dependencies with cache optimization
RUN npm ci --no-audit --no-fund

# Copy source code
COPY src/backend/src ./src

# Build TypeScript application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set proper permissions
RUN chown -R nodejs:nodejs /app

# Configure security headers and expose port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Start application with proper signal handling
CMD ["node", "dist/server.js"]