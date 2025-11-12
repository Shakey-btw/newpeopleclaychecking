# Setup Guide

This guide will help you set up and start both the frontend and backend services.

## Prerequisites

### 1. Node.js and npm

**Important:** This project uses NVM (Node Version Manager). Make sure NVM is installed and loaded.

**Check if NVM is installed:**
```bash
test -d ~/.nvm && echo "NVM found" || echo "NVM not found"
```

**If NVM is not installed, install it:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

**Load NVM in your current session:**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**Install Node.js via NVM:**
```bash
nvm install node  # or nvm install --lts for LTS version
nvm use node
```

**Verify installation:**
```bash
node --version
npm --version
```

**To make NVM load automatically**, add these lines to your `~/.zshrc` (or `~/.bash_profile`):
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 2. Python 3
Python 3 should already be installed on macOS. Verify:
```bash
python3 --version
```

### 3. Xcode Command Line Tools (macOS)
If not already installed:
```bash
xcode-select --install
```

## Backend Setup

1. **Navigate to backend directory:**
```bash
cd "peopleclaychecking/backend"
```

2. **Activate virtual environment:**
```bash
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Verify setup:**
```bash
python3 main.py --help
```

The backend is ready! The Python scripts will be executed via the Next.js API routes.

## Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd "peopleclaychecking/frontend"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Load NVM and start development server:**
```bash
# Load NVM (required!)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null

# Start the server
npm run dev
```

The frontend will start on `http://localhost:3000`

**Note:** First startup may take 1-2 minutes as Next.js compiles with Turbopack.

## Starting Both Services

### Option 1: Manual (Recommended for Development)

**Terminal 1 - Backend (if needed for direct Python script execution):**
```bash
cd "peopleclaychecking/backend"
source venv/bin/activate
# The backend runs via API routes, but you can test scripts directly:
# python3 main.py
```

**Terminal 2 - Frontend:**
```bash
cd "peopleclaychecking/frontend"

# Load NVM first!
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null

# Start the server
npm run dev
```

### Option 2: Using npm scripts (if you add them)

You can add scripts to the root `package.json` to start both services.

## API Routes

The frontend includes API routes that execute Python backend scripts:
- `/api/filters` - GET (list filters) / POST (add filter)
- `/api/matching` - POST (run matching)
- `/api/overview` - GET (get overview) / POST (sync/get companies)

These routes are located in:
- `frontend/src/app/api/filters/route.ts`
- `frontend/src/app/api/matching/route.ts`
- `frontend/src/app/api/overview/route.ts`

## Troubleshooting

### Node.js not found / npm: command not found

**This usually means NVM is not loaded in your shell session.**

**Solution:**
```bash
# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js
nvm use default 2>/dev/null || nvm use node 2>/dev/null || nvm use --lts 2>/dev/null

# Verify
node --version
npm --version
```

**To make NVM load automatically**, add to your `~/.zshrc` or `~/.bash_profile`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then restart your terminal or run `source ~/.zshrc`.

### Python virtual environment issues
- Ensure virtual environment exists: `ls venv/bin/activate`
- If missing, create one: `python3 -m venv venv`
- Then install dependencies: `pip install -r requirements.txt`

### API route errors
- Check that Python scripts are executable
- Verify backend directory path in API routes
- Check Python virtual environment is activated
- Review console logs for detailed error messages

### Port already in use
- Change Next.js port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

## Environment Variables

If needed, create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Database Files

The backend uses SQLite databases:
- `backend/pipedrive.db` - Pipedrive data
- `backend/lemlist_campaigns.db` - Lemlist campaigns
- `backend/results.db` - Matching results
- `backend/push_activity.db` - Push activity tracking
- `backend/filter_conditions.db` - Filter conditions

These are created automatically when scripts run.

## Quick Start Guide

For a quick reference on starting servers, see [START_SERVERS.md](./START_SERVERS.md).

