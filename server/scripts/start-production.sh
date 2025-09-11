#!/bin/bash
set -e

echo "🚀 Starting Flowshapr API Server..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set - skipping migrations"
else
    echo "📊 Running database migrations..."
    npx drizzle-kit migrate
    echo "✅ Database migrations completed"
fi

echo "🌟 Starting server..."
exec node dist/index.js