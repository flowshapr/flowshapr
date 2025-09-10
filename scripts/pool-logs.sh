#!/bin/bash

# Container Pool Management Script - Logs
# Shows logs from the container pool

set -e

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

# Default to showing logs from all containers
CONTAINER_FILTER="genkit-executor-1 genkit-executor-2 genkit-executor-3"

# Check if a specific container number was provided
if [ "$1" != "" ]; then
    if [[ "$1" =~ ^[1-3]$ ]]; then
        CONTAINER_FILTER="genkit-executor-$1"
        echo "📋 Showing logs for container $1:"
    else
        echo "❌ Invalid container number. Use 1, 2, or 3."
        exit 1
    fi
else
    echo "📋 Showing logs for all containers (use 'pool-logs.sh 1' for specific container):"
fi

echo "=================================="

# Follow logs by default, add --no-follow if you want to see just current logs
$COMPOSE_CMD logs -f $CONTAINER_FILTER