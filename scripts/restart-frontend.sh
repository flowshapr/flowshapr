#!/bin/bash

# Frontend restart script
# Stops any running Next.js dev server and starts a new one

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎨 Restarting Flowshapr Frontend${NC}"
echo "=============================="

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Kill existing Next.js processes
echo -e "${YELLOW}🔪 Stopping existing Next.js processes...${NC}"
NEXT_PIDS=$(ps aux | grep "next dev" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$NEXT_PIDS" ]; then
  echo -e "${BLUE}🌐 Killing Next.js processes: $NEXT_PIDS${NC}"
  echo $NEXT_PIDS | xargs kill -9 2>/dev/null || true
fi

# Free up port 3000
PID_3000=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$PID_3000" ]; then
  echo -e "${BLUE}🔓 Freeing port 3000 (PID: $PID_3000)${NC}"
  kill -9 $PID_3000 2>/dev/null || true
fi

# Start the frontend
echo -e "${YELLOW}🚀 Starting Next.js development server...${NC}"
echo -e "${BLUE}🌐 Frontend will start on http://localhost:3000${NC}"
echo -e "${GREEN}✨ Press Ctrl+C to stop the server.${NC}"
echo ""

# Start Next.js dev server
exec npm run dev