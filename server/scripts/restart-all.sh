#!/bin/bash

# Comprehensive restart script for Flowshapr development environment
# This script cleanly shuts down all servers and restarts them

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Restarting Flowshapr Development Environment${NC}"
echo "=============================================="

# Navigate to server directory
cd "$(dirname "$0")/.."

# Step 1: Clean up existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
./scripts/clean-all.sh

# Give processes a moment to fully terminate
sleep 2

# Step 2: Build server if needed
echo -e "${YELLOW}🔧 Building server...${NC}"
npm run build

# Step 3: Start Next.js frontend in background
echo -e "${YELLOW}🌐 Starting Next.js frontend...${NC}"
cd ..
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait a moment for frontend to start
sleep 3

# Step 4: Start the server
echo -e "${YELLOW}🚀 Starting Flowshapr server...${NC}"
cd server
echo -e "${BLUE}💡 Server will start on port ${PORT:-3001}${NC}"
echo -e "${BLUE}📱 Health check: http://localhost:${PORT:-3001}/health${NC}"
echo -e "${BLUE}📊 Status endpoint: http://localhost:${PORT:-3001}/api/system/status${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo ""
echo -e "${GREEN}✨ Restart complete! Press Ctrl+C to stop all servers.${NC}"
echo ""

# Cleanup function for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill frontend
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${BLUE}📱 Stopping frontend (PID: $FRONTEND_PID)${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Clean up any remaining processes
    ./scripts/clean-all.sh
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Start the server in the foreground
exec npm run dev