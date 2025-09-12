#!/bin/bash
set -e

echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.dev.yml down -v --remove-orphans

echo "🗂️ Removing old database volume..."
docker volume rm docker_postgres_dev_data 2>/dev/null || true

echo "🚀 Starting fresh development environment..."
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "📊 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo "✅ Development environment ready!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:3001"
echo "   Executor: http://localhost:3002"
echo "   Database: localhost:5432"
echo ""
echo "📝 View logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛠️ Stop everything:"
echo "   docker-compose -f docker-compose.dev.yml down"