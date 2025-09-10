#!/bin/bash

# Container Pool Management Script - Start
# Starts the pre-warmed container pool using docker-compose

set -e

echo "🏊 Starting Flowshapr Container Pool..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Docker and docker-compose are required but not installed."
    exit 1
fi

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

# Build and start the container pool
echo "🔨 Building containers..."
$COMPOSE_CMD build --no-cache genkit-executor-1 genkit-executor-2 genkit-executor-3

echo "🚀 Starting container pool..."
$COMPOSE_CMD up -d genkit-executor-1 genkit-executor-2 genkit-executor-3

echo "⏳ Waiting for containers to be healthy..."
sleep 10

# Check container health
for i in {1..3}; do
    container_name="flowshapr-genkit-executor-$i"
    if $COMPOSE_CMD ps --services --filter "status=running" | grep -q "genkit-executor-$i"; then
        echo "✅ Container $container_name is running"
    else
        echo "❌ Container $container_name failed to start"
        echo "📋 Checking logs..."
        $COMPOSE_CMD logs "genkit-executor-$i"
        exit 1
    fi
done

echo "🎉 Container pool started successfully!"
echo ""
echo "📊 Pool Status:"
$COMPOSE_CMD ps genkit-executor-1 genkit-executor-2 genkit-executor-3

echo ""
echo "🔍 To monitor the pool:"
echo "  scripts/pool-status.sh    - Check pool status"
echo "  scripts/pool-logs.sh      - View container logs"
echo "  scripts/pool-stop.sh      - Stop the pool"