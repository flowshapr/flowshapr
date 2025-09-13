#!/bin/bash
set -e

# Parse command line arguments
PRESERVE_DB=true
CLEAN_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --clean-db|--reset-db)
      PRESERVE_DB=false
      shift
      ;;
    --clean-all)
      CLEAN_ALL=true
      PRESERVE_DB=false
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --clean-db, --reset-db    Reset the database (remove volume)"
      echo "  --clean-all              Reset everything (all volumes)"
      echo "  -h, --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

echo "🧹 Cleaning up existing containers..."
if [ "$CLEAN_ALL" = true ]; then
  echo "   ⚠️  Removing ALL volumes (including database and node_modules)..."
  docker-compose -f docker-compose.dev.yml down -v --remove-orphans
elif [ "$PRESERVE_DB" = false ]; then
  echo "   ⚠️  Removing database volume..."
  docker-compose -f docker-compose.dev.yml down --remove-orphans
  docker volume rm docker_postgres_dev_data 2>/dev/null || true
else
  echo "   ✅ Preserving database volume..."
  docker-compose -f docker-compose.dev.yml down --remove-orphans
fi

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
echo ""
echo "🔄 Restart options:"
echo "   ./start-dev.sh                    # Preserve database"
echo "   ./start-dev.sh --clean-db         # Reset database only"
echo "   ./start-dev.sh --clean-all        # Reset everything"