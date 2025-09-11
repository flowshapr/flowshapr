# Multi-stage build for Express.js production deployment
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    wget \
    ca-certificates \
    && update-ca-certificates

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm install drizzle-kit --no-save && \
    npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Install all dependencies including dev dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Install tsc-alias for path resolution
RUN npm install tsc-alias --no-save

# Copy source code
COPY . .

# Build the application and resolve path aliases
RUN npm run build && npx tsc-alias -p tsconfig.json

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 flowshapr && \
    adduser --system --uid 1001 --ingroup flowshapr flowshapr

# Copy built application and production dependencies
COPY --from=deps --chown=flowshapr:flowshapr /app/node_modules ./node_modules
COPY --from=builder --chown=flowshapr:flowshapr /app/dist ./dist
COPY --from=builder --chown=flowshapr:flowshapr /app/package*.json ./
COPY --from=builder --chown=flowshapr:flowshapr /app/drizzle ./drizzle
COPY --from=builder --chown=flowshapr:flowshapr /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=flowshapr:flowshapr /app/scripts/start-production.sh ./start-production.sh

# Create necessary directories and make startup script executable
RUN mkdir -p /app/logs /app/temp /app/uploads && \
    chown -R flowshapr:flowshapr /app/logs /app/temp /app/uploads && \
    chmod 755 /app/logs /app/temp /app/uploads && \
    chmod +x /app/start-production.sh

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Switch to non-root user
USER flowshapr

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with migrations
CMD ["./start-production.sh"]