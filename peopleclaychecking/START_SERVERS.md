# How to Start the Servers

This document explains how to start both the frontend and backend servers for the PeopleClayChecking application.

## Quick Start

### Option 1: Using the Startup Script (Easiest)

Simply run the startup script from the project root:

```bash
cd "peopleclaychecking"
./start-dev.sh
```

This script will:
- Automatically load NVM
- Use the correct Node.js version
- Install dependencies if needed
- Start the development server

### Option 2: Manual Start

### Frontend Server (Next.js)

The frontend server is the main entry point. It runs on port 3000 and handles both the UI and API routes that execute Python backend scripts.

**Important:** This project uses NVM (Node Version Manager). Make sure to load NVM before running npm commands.

```bash
# Navigate to frontend directory
cd "peopleclaychecking/frontend"

# Load NVM and use Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null

# Start the development server
npm run dev
```

The server will start on:
- **Local:** http://localhost:3000
- **Network:** http://192.168.178.29:3000 (or your local IP)

**First startup may take 1-2 minutes** as Next.js compiles with Turbopack.

### Backend (Python Scripts)

The backend is **not a separate server**. Python scripts are executed on-demand by Next.js API routes. The virtual environment is already set up and will be activated automatically by the API routes.

**No separate backend server needs to be started.**

If you need to run Python scripts directly for testing:

```bash
# Navigate to backend directory
cd "peopleclaychecking/backend"

# Activate virtual environment
source venv/bin/activate

# Run scripts directly (optional, for testing)
python3 main.py
```

## Troubleshooting

### Issue: "npm: command not found" or "node: command not found"

**Cause:** NVM is not loaded in your shell session.

**Solution:** Load NVM before running npm commands:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default
```

To make this permanent, add these lines to your `~/.zshrc` or `~/.bash_profile`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Issue: Server takes a long time to start

**Normal behavior:** First startup with Turbopack can take 1-2 minutes. Subsequent starts are faster.

**Check if it's working:**
```bash
# Check if port 3000 is listening
lsof -i :3000

# Check server logs
tail -f /tmp/nextjs-full.log  # if running in background with logging
```

### Issue: Port 3000 already in use

**Solution:** Kill the existing process or use a different port:

```bash
# Kill existing Next.js processes
pkill -f "next dev"

# Or use a different port
PORT=3001 npm run dev
```

### Issue: Workspace root warning

**Warning:** "Next.js inferred your workspace root, but it may not be correct"

This is a harmless warning about multiple `package-lock.json` files. It doesn't affect functionality. To silence it, you can:

1. Remove the root-level `package-lock.json` if not needed
2. Or add to `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     turbopack: {
       root: process.cwd(),
     },
   };
   ```

## Architecture Overview

- **Frontend:** Next.js 15.5.2 with Turbopack
  - Handles UI rendering
  - Provides API routes in `src/app/api/`
  - Executes Python scripts via child processes

- **Backend:** Python scripts executed on-demand
  - Located in `peopleclaychecking/backend/`
  - Uses virtual environment at `backend/venv/`
  - Scripts are called by Next.js API routes using `spawn`
  - API routes activate the venv automatically

## Verification

After starting the server, verify it's working:

1. **Check process is running:**
   ```bash
   ps aux | grep "next dev" | grep -v grep
   ```

2. **Check port is listening:**
   ```bash
   lsof -i :3000
   ```

3. **Test HTTP response:**
   ```bash
   curl http://localhost:3000
   ```

4. **Open in browser:**
   - Navigate to: http://localhost:3000
   - You should see the navigation menu in the top-left corner

## Background Process (Optional)

To run the server in the background:

```bash
cd "peopleclaychecking/frontend"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default 2>/dev/null

# Run in background with logging
nohup npm run dev > /tmp/nextjs.log 2>&1 &

# Check logs
tail -f /tmp/nextjs.log

# Stop the server
pkill -f "next dev"
```

## Key Files

- Frontend entry: `peopleclaychecking/frontend/src/app/page.tsx`
- API routes: `peopleclaychecking/frontend/src/app/api/`
- Backend scripts: `peopleclaychecking/backend/*.py`
- Python venv: `peopleclaychecking/backend/venv/`

## Summary

**Easiest way to start:**
```bash
cd "peopleclaychecking"
./start-dev.sh
```

**Or manually:**
1. Load NVM: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"`
2. Use Node: `nvm use default`
3. Navigate: `cd "peopleclaychecking/frontend"`
4. Start: `npm run dev`
5. Open: http://localhost:3000

**No separate backend server needed** - Python scripts run automatically via API routes.

