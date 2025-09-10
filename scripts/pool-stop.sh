#!/bin/bash

# Container Pool Management Script - Stop
# Stops the pre-warmed container pool

set -e

echo "🛑 Stopping Flowshapr Container Pool..."

# Use docker compose (newer) or docker-compose (legacy)
COMPOSE_CMD="docker compose"
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Neither 'docker compose' nor 'docker-compose' is available."
        exit 1
    fi
fi

# Stop the containers gracefully
echo "⏹️  Stopping containers..."
$COMPOSE_CMD stop genkit-executor-1 genkit-executor-2 genkit-executor-3

# Remove the containers
echo "🗑️  Removing containers..."
$COMPOSE_CMD rm -f genkit-executor-1 genkit-executor-2 genkit-executor-3

echo "✅ Container pool stopped successfully!"

# Optional: Clean up volumes (uncomment if needed)
# echo "🧹 Cleaning up volumes..."
# $COMPOSE_CMD down -v