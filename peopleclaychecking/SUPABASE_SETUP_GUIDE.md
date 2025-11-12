# Supabase Setup Guide - Complete Instructions

This guide will walk you through setting up all Supabase tables and using them in your components.

## 📋 Step 1: Create Tables in Supabase

### Option A: Using SQL Editor (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the SQL Script**
   - Open the file `SUPABASE_TABLES.sql` in this project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - ✅ `organizations`
     - ✅ `campaigns`
     - ✅ `leads`
     - ✅ `user_filters`
     - ✅ `filtered_organizations`
     - ✅ `matching_summary`
     - ✅ `detailed_matches`
     - ✅ `change_log`
     - ✅ `filter_conditions`
     - ✅ `organization_custom_fields`

### Option B: Using Table Editor (Manual)

If you prefer to create tables manually:

1. Go to "Table Editor" → "New table"
2. Create each table with the columns listed in `SUPABASE_TABLES.sql`
3. Set primary keys and foreign keys as specified

**Note:** Option A (SQL Editor) is much faster and ensures everything is set up correctly.

## 📊 Table Descriptions

### Core Tables

#### 1. `organizations`
Stores Pipedrive organization data.
- **Primary Key:** `id` (INTEGER)
- **Key Fields:** `name`, `address_country`, `owner_name`, etc.
- **Use Case:** All Pipedrive organizations

#### 2. `campaigns`
Stores Lemlist campaign information.
- **Primary Key:** `id` (TEXT)
- **Key Fields:** `name`, `status`, `is_active`
- **Use Case:** All Lemlist campaigns

#### 3. `leads`
Stores individual leads from Lemlist campaigns.
- **Primary Key:** `id` (TEXT)
- **Foreign Key:** `campaign_id` → `campaigns(id)`
- **Key Fields:** `email`, `company_name`, `state`, `campaign_id`
- **Use Case:** All leads across all campaigns

#### 4. `user_filters`
Stores Pipedrive filter configurations.
- **Primary Key:** `id` (SERIAL)
- **Unique:** `filter_id` (TEXT)
- **Use Case:** Saved Pipedrive filters

#### 5. `filtered_organizations`
Links organizations to filters.
- **Primary Key:** `id` (SERIAL)
- **Foreign Keys:** `filter_id` → `user_filters(filter_id)`, `org_id` → `organizations(id)`
- **Use Case:** Which organizations match which filters

### Analytics Tables

#### 6. `matching_summary`
Summary statistics for company matching.
- **Primary Key:** `id` (SERIAL)
- **Unique:** `filter_id`
- **Use Case:** Matching results overview

#### 7. `detailed_matches`
Detailed matching results.
- **Primary Key:** `id` (SERIAL)
- **Use Case:** Individual company matches

#### 8. `change_log`
Tracks changes to campaigns and leads.
- **Primary Key:** `id` (SERIAL)
- **Use Case:** Activity history

## 🔧 Step 2: Using Supabase in Components

### Basic Usage

```typescript
import { supabase } from '@/lib/supabase'

// Query data
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('is_active', true)
```

### Using Helper Functions

I've created helper functions in `src/lib/supabase-helpers.ts`:

```typescript
import { 
  getCampaigns, 
  getOverviewData, 
  getLeadsByCampaign 
} from '@/lib/supabase-helpers'

// Get all campaigns
const campaigns = await getCampaigns()

// Get overview data (campaigns with stats)
const { campaigns, lastUpdate } = await getOverviewData()

// Get leads for a campaign
const leads = await getLeadsByCampaign('campaign-id-123')
```

### Example: Updated Overview Component

The `overview/page.tsx` component has been updated to use Supabase. It:
- ✅ Fetches campaigns from Supabase
- ✅ Calculates stats (unique companies, total leads, ratio)
- ✅ Copies companies to clipboard
- ✅ Falls back to API routes if Supabase fails

## 📝 Step 3: Migrating Data (Optional)

If you have existing SQLite data, you can migrate it:

### Using Python Script

```python
from supabase_client import get_supabase_client
import sqlite3

# Connect to SQLite
sqlite_conn = sqlite3.connect('pipedrive.db')
cursor = sqlite_conn.cursor()

# Get Supabase client
supabase = get_supabase_client().get_client()

# Migrate organizations
cursor.execute("SELECT * FROM organizations")
orgs = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

for org in orgs:
    org_dict = dict(zip(columns, org))
    supabase.table("organizations").upsert(org_dict).execute()
```

## 🔒 Step 4: Row Level Security (Optional)

If you want to enable Row Level Security:

1. Go to "Authentication" → "Policies" in Supabase
2. Enable RLS on tables you want to protect
3. Create policies based on your needs

**For now, you can leave RLS disabled** if you're the only user.

## ✅ Step 5: Verify Everything Works

1. **Test the connection:**
   - Visit: http://localhost:3000/test-supabase
   - Should show "✅ Connected"

2. **Test the Overview page:**
   - Visit: http://localhost:3000/overview
   - Should load campaigns (if you have data)

3. **Insert test data:**
   ```typescript
   import { supabase } from '@/lib/supabase'
   
   // Insert a test campaign
   await supabase.from('campaigns').insert({
     id: 'test-123',
     name: 'Test Campaign',
     status: 'running'
   })
   ```

## 🚀 Step 6: Deploy to Vercel

When deploying to Vercel, make sure to:

1. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Tables are already in Supabase (cloud), so they'll work automatically!

## 📚 Available Helper Functions

### Campaigns
- `getCampaigns()` - Get all active campaigns
- `getCampaignById(id)` - Get single campaign
- `upsertCampaign(campaign)` - Create or update campaign

### Leads
- `getLeadsByCampaign(campaignId)` - Get leads for a campaign
- `getUniqueCompaniesByCampaign(campaignId)` - Get unique company names
- `getCampaignStats(campaignId)` - Get stats (leads, companies, ratio)

### Overview
- `getOverviewData()` - Get all campaigns with stats

### Organizations
- `getOrganizations(limit)` - Get organizations
- `getOrganizationById(id)` - Get single organization

### Filters
- `getUserFilters()` - Get all active filters

### Matching
- `getMatchingSummary(filterId)` - Get matching summary

## 🐛 Troubleshooting

### "Table does not exist" error
- Make sure you ran the SQL script in Supabase SQL Editor
- Check Table Editor to verify tables exist

### "Permission denied" error
- Check Row Level Security settings
- Verify your anon key is correct

### Data not showing
- Check if data exists in Supabase Table Editor
- Verify your queries are correct
- Check browser console for errors

## 📖 Next Steps

1. ✅ Create tables (Step 1)
2. ✅ Test connection (Step 5)
3. ✅ Start using in components
4. ✅ Migrate existing data (if needed)
5. ✅ Deploy to Vercel

Your Supabase setup is complete! 🎉

