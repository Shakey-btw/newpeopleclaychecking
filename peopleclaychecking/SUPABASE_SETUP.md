# Supabase Connection Guide

This guide explains how to connect your application to Supabase (PostgreSQL database).

## Prerequisites

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note down your project URL and anon/public key

2. **Get Your Database Connection String**
   - In Supabase Dashboard → Settings → Database
   - Find "Connection string" → "URI" or "Connection pooling"
   - Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)

## Installation

### Backend (Python)

1. **Install Supabase Python client:**
   ```bash
   cd peopleclaychecking/backend
   source venv/bin/activate
   pip install supabase psycopg2-binary
   ```

2. **Update requirements.txt:**
   ```bash
   echo "supabase>=2.0.0" >> requirements.txt
   echo "psycopg2-binary>=2.9.0" >> requirements.txt
   ```

### Frontend (Next.js) - Optional

If you want to use Supabase client-side:

```bash
cd peopleclaychecking/frontend
npm install @supabase/supabase-js
```

## Configuration

### 1. Create Environment Variables File

Create a `.env` file in the `backend` directory:

```bash
cd peopleclaychecking/backend
touch .env
```

Add your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-ROLE-KEY]  # For server-side operations

# Database Connection (Direct PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Optional: Keep SQLite as fallback
USE_SUPABASE=true
SQLITE_FALLBACK=true
```

**Important:** Add `.env` to `.gitignore` to keep credentials safe!

### 2. Update .gitignore

Make sure `.env` is in your `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

## Usage Examples

### Python Backend - Using Supabase Client

Create a new file `peopleclaychecking/backend/supabase_client.py`:

```python
import os
from supabase import create_client, Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Supabase client wrapper"""
    
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    
    def get_client(self) -> Client:
        """Get the Supabase client instance"""
        return self.client

# Singleton instance
_supabase_client: Optional[SupabaseClient] = None

def get_supabase_client() -> SupabaseClient:
    """Get or create Supabase client instance"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client
```

### Python Backend - Using Direct PostgreSQL Connection

For more control, you can use `psycopg2` directly:

```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SupabaseDatabase:
    """Direct PostgreSQL connection to Supabase"""
    
    def __init__(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL must be set in environment variables")
        
        self.conn = psycopg2.connect(database_url)
        logger.info("Supabase PostgreSQL connection established")
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dicts"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected rows"""
        with self.conn.cursor() as cursor:
            cursor.execute(query, params)
            self.conn.commit()
            return cursor.rowcount
    
    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()
```

### Example: Migrating Pipedrive Data to Supabase

```python
import os
from supabase_client import get_supabase_client
import sqlite3

def migrate_pipedrive_to_supabase():
    """Migrate data from SQLite to Supabase"""
    
    # Read from SQLite
    sqlite_conn = sqlite3.connect("pipedrive.db")
    sqlite_cursor = sqlite_conn.cursor()
    
    # Get all organizations
    sqlite_cursor.execute("SELECT * FROM organizations")
    organizations = sqlite_cursor.fetchall()
    
    # Get column names
    columns = [description[0] for description in sqlite_cursor.description]
    
    # Write to Supabase
    supabase = get_supabase_client().get_client()
    
    for org in organizations:
        org_dict = dict(zip(columns, org))
        supabase.table("organizations").insert(org_dict).execute()
    
    sqlite_conn.close()
    print(f"Migrated {len(organizations)} organizations to Supabase")
```

### Frontend - Using Supabase Client (Next.js)

Create `peopleclaychecking/frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

Usage in a React component:

```typescript
import { supabase } from '@/lib/supabase'

// Fetch data
const { data, error } = await supabase
  .from('organizations')
  .select('*')
  .limit(10)

// Insert data
const { data, error } = await supabase
  .from('organizations')
  .insert([{ name: 'Company Name', ... }])
```

## Migration Strategy

### Option 1: Hybrid Approach (Recommended for gradual migration)
- Keep SQLite for local development
- Use Supabase for production
- Add a database abstraction layer that can switch between them

### Option 2: Full Migration
- Migrate all SQLite databases to Supabase
- Update all database classes to use Supabase
- Remove SQLite dependencies

## Creating Tables in Supabase

You can create tables via:
1. **Supabase Dashboard** → Table Editor → New Table
2. **SQL Editor** in Supabase Dashboard
3. **Migration scripts** using Supabase CLI

Example SQL for organizations table:

```sql
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT,
    owner_name TEXT,
    cc_email TEXT,
    address TEXT,
    -- ... other fields
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);
```

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use environment variables** - Store credentials securely
3. **Use Row Level Security (RLS)** - Enable RLS in Supabase for data protection
4. **Use Service Role Key carefully** - Only use server-side, never expose to client
5. **Use Anon Key for client** - This is safe to expose in frontend code

## Next Steps

1. Set up your Supabase project
2. Install dependencies
3. Create `.env` file with credentials
4. Test connection with a simple query
5. Migrate data from SQLite (if needed)
6. Update your database classes to use Supabase

## Troubleshooting

### Connection Issues
- Verify your DATABASE_URL is correct
- Check if your IP is allowed in Supabase (Settings → Database → Connection Pooling)
- Ensure your password doesn't contain special characters that need URL encoding

### Import Errors
- Make sure you've activated your virtual environment
- Verify packages are installed: `pip list | grep supabase`

### Authentication Issues
- Double-check your SUPABASE_KEY matches your project
- Ensure you're using the correct key (anon vs service role)

