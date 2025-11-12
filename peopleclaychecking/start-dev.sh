#!/bin/bash

# Startup script for PeopleClayChecking development server
# This script loads NVM and starts the Next.js development server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting PeopleClayChecking Development Server...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Load NVM
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo -e "${YELLOW}Loading NVM...${NC}"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Use Node.js (try default, then node, then lts)
    if command -v nvm &> /dev/null; then
        nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}Warning: NVM not found. Make sure Node.js is in your PATH.${NC}"
fi

# Verify Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Error: Node.js not found. Please install Node.js or set up NVM.${NC}"
    echo "See SETUP.md for instructions."
    exit 1
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Error: npm not found. Please install npm.${NC}"
    exit 1
fi

echo -e "${GREEN}Node.js version: $(node --version)${NC}"
echo -e "${GREEN}npm version: $(npm --version)${NC}"

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Start the development server
echo -e "${GREEN}Starting Next.js development server...${NC}"
echo -e "${YELLOW}Server will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}First startup may take 1-2 minutes...${NC}"
echo ""

npm run dev

