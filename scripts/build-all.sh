#!/bin/bash

echo "🏗️  Building Flowshapr..."

# Build backend
echo "📦 Building backend..."
cd server
if npm run build; then
    echo "✅ Backend build completed successfully"
    cd ..
else
    echo "❌ Backend build failed"
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
if npm run build; then
    echo "✅ Frontend build completed successfully"
    cd ..
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🎉 All builds completed successfully!"
echo ""
echo "To start the servers:"
echo "1. Backend: cd server && npm start"
echo "2. Frontend: cd frontend && npm start"