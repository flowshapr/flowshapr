#!/bin/bash

# Clean up all Flowshapr processes  
# This script safely stops all development servers (Next.js and Node.js)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧹 Cleaning up Flowshapr development environment...${NC}"

# Step 1: Kill npm and node development processes
echo -e "${YELLOW}🔪 Stopping development server processes...${NC}"

# Find and kill npm run dev processes
NPM_PIDS=$(ps aux | grep "npm run dev" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$NPM_PIDS" ]; then
  echo -e "${BLUE}📦 Killing npm processes: $NPM_PIDS${NC}"
  echo $NPM_PIDS | xargs kill -9 2>/dev/null || true
fi

# Find and kill tsx/next server processes
NODE_PIDS=$(ps aux | grep -E "(tsx watch|next dev|next-server)" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$NODE_PIDS" ]; then
  echo -e "${BLUE}🌐 Killing node server processes: $NODE_PIDS${NC}"
  echo $NODE_PIDS | xargs kill -9 2>/dev/null || true
fi

# Find and kill any remaining node processes that might be servers
SERVER_PIDS=$(ps aux | grep -E "node.*server|server.*node" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$SERVER_PIDS" ]; then
  echo -e "${BLUE}🖥️  Killing server processes: $SERVER_PIDS${NC}"
  echo $SERVER_PIDS | xargs kill -9 2>/dev/null || true
fi

# Step 2: Kill processes on common development ports
echo -e "${YELLOW}🔌 Freeing up development ports...${NC}"
for port in 3000 3001 3002 3003 3004 3005; do
  PID=$(lsof -ti:$port 2>/dev/null || true)
  if [ ! -z "$PID" ]; then
    echo -e "${BLUE}🔓 Freeing port $port (PID: $PID)${NC}"
    kill -9 $PID 2>/dev/null || true
  fi
done

# Step 3: Clean up temp files
echo -e "${YELLOW}🗑️  Cleaning up temp files...${NC}"
rm -rf ../temp/* 2>/dev/null || true
rm -rf temp/* 2>/dev/null || true
# Clean up any lingering .mjs wrapper files
find . -name "*-wrapper.mjs" -type f -delete 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo -e "${BLUE}💡 All processes stopped, ports freed, temp files cleaned${NC}"