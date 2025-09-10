#!/bin/bash

# Container Pool Management Script - Status
# Shows the status of the pre-warmed container pool

set -e

echo "📊 Flowshapr Container Pool Status"
echo "=================================="

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

echo ""
echo "🐳 Container Status:"
$COMPOSE_CMD ps genkit-executor-1 genkit-executor-2 genkit-executor-3

echo ""
echo "💾 Volume Usage:"
docker volume ls | grep "genkit-builder.*executor" || echo "No volumes found"

echo ""
echo "🏥 Health Status:"
for i in {1..3}; do
    container_name="flowshapr-genkit-executor-$i"
    
    # Check if container exists and is running
    if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        # Get health status
        health_status=$(docker inspect "$container_name" --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck")
        
        if [ "$health_status" = "no-healthcheck" ]; then
            # Check if .ready file exists in work volume
            volume_name="genkit-builder_executor_work_$i"
            if docker run --rm -v "$volume_name:/check" alpine test -f /check/.ready 2>/dev/null; then
                health_status="ready"
            else
                health_status="not-ready"
            fi
        fi
        
        case $health_status in
            "healthy"|"ready")
                echo "✅ $container_name: $health_status"
                ;;
            "unhealthy"|"not-ready")
                echo "❌ $container_name: $health_status"
                ;;
            "starting")
                echo "🟡 $container_name: $health_status"
                ;;
            *)
                echo "❓ $container_name: $health_status"
                ;;
        esac
    else
        echo "💤 $container_name: stopped"
    fi
done

echo ""
echo "📈 Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    $(docker ps --format "{{.Names}}" | grep "flowshapr-genkit-executor" | head -3) 2>/dev/null || \
    echo "No running containers to show stats"

echo ""
echo "🔧 Quick Actions:"
echo "  scripts/pool-logs.sh      - View container logs"  
echo "  scripts/pool-restart.sh   - Restart the pool"
echo "  scripts/pool-stop.sh      - Stop the pool"