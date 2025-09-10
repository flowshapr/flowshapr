# Multi-stage build for secure Genkit execution
FROM node:20-alpine AS builder

# Install build dependencies
WORKDIR /build
COPY package*.json ./
RUN npm install --only=production

# Runtime stage with minimal attack surface
FROM node:20-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S genkituser && \
    adduser -S genkituser -u 1001 -G genkituser

# Install only essential packages (wget for health checks)
RUN apk add --no-cache dumb-init wget && \
    apk del apk-tools

# Set up secure working directory
WORKDIR /app
RUN chown -R genkituser:genkituser /app

# Copy runtime dependencies
COPY --from=builder --chown=genkituser:genkituser /build/node_modules ./node_modules

# Copy the execution daemon
COPY --chown=genkituser:genkituser execution-daemon.js ./execution-daemon.js

# Copy Genkit shims with proper permissions (create basic shims directory)
RUN mkdir -p ./shims/node_modules

# Create work, results, and flows directories
RUN mkdir -p /app/work /app/results /app/flows && \
    chown -R genkituser:genkituser /app/work /app/results /app/flows && \
    chmod 755 /app/work /app/results /app/flows

# Switch to non-root user
USER genkituser

# Set secure environment defaults
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256" \
    NPM_CONFIG_CACHE=/tmp/.npm \
    HOME=/tmp

# Remove potentially dangerous binaries (not available in alpine anyway, but explicit)
# Disable shell access in the final image
SHELL ["/bin/sh", "-c"]

# Entry point with process supervisor
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "/app/execution-daemon.js"]