# Quick Start: Supabase Tables Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Tables in Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `micgjeldkzqxpexbxqfm`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run SQL Script**
   - Open file: `SUPABASE_TABLES.sql`
   - Copy ALL the SQL code
   - Paste into SQL Editor
   - Click "Run" (or Cmd/Ctrl + Enter)

4. **Verify**
   - Go to "Table Editor"
   - You should see 10 tables created ✅

### Step 2: Test It Works

Visit: http://localhost:3000/overview

The page will now use Supabase! (It falls back to API if Supabase isn't ready)

## 📊 Tables You Need

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `organizations` | Pipedrive companies | `id`, `name`, `address_country` |
| `campaigns` | Lemlist campaigns | `id`, `name`, `status` |
| `leads` | Individual leads | `id`, `campaign_id`, `company_name`, `email` |
| `user_filters` | Saved Pipedrive filters | `filter_id`, `filter_name` |
| `filtered_organizations` | Org-to-filter mapping | `filter_id`, `org_id` |
| `matching_summary` | Matching statistics | `filter_id`, `matching_companies` |
| `detailed_matches` | Individual matches | `pipedrive_org_name`, `lemlist_company_name` |
| `change_log` | Activity history | `change_type`, `campaign_id` |
| `filter_conditions` | Filter configurations | `filter_id`, `conditions_json` |
| `organization_custom_fields` | Custom org fields | `org_id`, `field_key`, `field_value` |

## 💻 Using Supabase in Code

### Basic Query
```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('campaigns')
  .select('*')
```

### Using Helpers (Easier!)
```typescript
import { getCampaigns, getOverviewData } from '@/lib/supabase-helpers'

// Get all campaigns
const campaigns = await getCampaigns()

// Get overview with stats
const { campaigns, lastUpdate } = await getOverviewData()
```

## ✅ Done!

Your components are already updated to use Supabase. Just create the tables and you're ready to go!

See `SUPABASE_SETUP_GUIDE.md` for detailed instructions.

