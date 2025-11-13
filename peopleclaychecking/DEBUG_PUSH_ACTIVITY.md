# Debug Guide: Push Activity No Data Issue

## Quick Diagnostic Steps

### Step 1: Check Diagnostic Endpoint

Visit your deployed app and go to:
```
https://your-app.vercel.app/api/debug/diagnose
```

This will show you:
- Environment variables status
- Supabase connection status
- Campaign data availability
- Lead data availability
- Any errors in the connection chain

### Step 2: Check Browser Console

1. Open your deployed app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Navigate to the Push Activity page
5. Look for logs starting with `[push-activity]` and `[supabase-helpers]`

### Step 3: Check Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" → Latest deployment → "Functions" tab
4. Click on `/api/push-activity` function
5. Check the logs for errors

## Common Issues & Solutions

### Issue 1: Environment Variables Not Set

**Symptoms:**
- Diagnostic shows `hasUrl: false` or `hasKey: false`
- Console shows "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables for **Production, Preview, AND Development**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://micgjeldkzqxpexbxqfm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2dqZWxka3pxeHBleGJ4cWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQwMDcsImV4cCI6MjA3ODQ2MDAwN30.lF4lnzyFNn1GijceoUJ77tosxf7E4rYF-Q-9SA6rGVs
   ```
3. **Redeploy** your application (Vercel doesn't automatically redeploy when env vars change)

### Issue 2: No Data in Supabase

**Symptoms:**
- Diagnostic shows `getCampaigns: { count: 0 }`
- Console shows "WARNING: No campaigns found in Supabase"

**Solution:**
1. **Check if data exists in Supabase:**
   - Go to Supabase Dashboard → Table Editor
   - Check `campaigns` table - are there any rows?
   - Check `leads` table - are there any rows?
   - Check if `is_active = true` for campaigns

2. **If no data exists, sync from local:**
   ```bash
   cd backend
   source venv/bin/activate
   python3 push_activity.py --update-campaigns
   ```
   This will sync campaigns and leads to Supabase.

3. **Verify data was written:**
   - Check Supabase Dashboard → Table Editor → `campaigns` table
   - Should see campaigns with `is_active = true`
   - Check `leads` table - should see leads with `campaign_id` matching campaigns

### Issue 3: Supabase Connection Error

**Symptoms:**
- Diagnostic shows `supabaseClientInit: { success: false }`
- Console shows Supabase connection errors
- API returns `error: "Supabase connection failed"`

**Solution:**
1. **Verify Supabase URL and Key:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the Project URL (should be `https://micgjeldkzqxpexbxqfm.supabase.co`)
   - Copy the `anon` `public` key
   - Verify these match your Vercel environment variables

2. **Check Supabase Project Status:**
   - Make sure your Supabase project is active (not paused)
   - Check if you've hit any rate limits

3. **Test Connection:**
   - Use the diagnostic endpoint: `/api/debug/diagnose`
   - Check the `directQuery` test results

### Issue 4: Row Level Security (RLS) Enabled

**Symptoms:**
- Diagnostic shows connection works but queries return empty
- Console shows permission errors

**Solution:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Check if RLS is enabled on `campaigns` and `leads` tables
3. If RLS is enabled, either:
   - **Option A:** Disable RLS (for development/testing)
   - **Option B:** Create policies that allow anonymous read access:
     ```sql
     -- Allow anonymous read access to campaigns
     CREATE POLICY "Allow anonymous read" ON campaigns
       FOR SELECT USING (true);
     
     -- Allow anonymous read access to leads
     CREATE POLICY "Allow anonymous read" ON leads
       FOR SELECT USING (true);
     ```

### Issue 5: All Campaigns Filtered Out

**Symptoms:**
- Diagnostic shows campaigns exist but `getUniqueCompanies` returns 0
- Console shows campaigns but they don't appear in UI

**Solution:**
1. **Check if campaigns have leads:**
   - In Supabase, query: `SELECT campaign_id, COUNT(*) FROM leads WHERE is_active = true GROUP BY campaign_id`
   - Verify campaigns have leads

2. **Check if leads have company names:**
   - In Supabase, query: `SELECT campaign_id, COUNT(DISTINCT company_name) FROM leads WHERE is_active = true AND company_name IS NOT NULL GROUP BY campaign_id`
   - Verify leads have company names

3. **Check if all leads are paused:**
   - In Supabase, query: `SELECT campaign_id, COUNT(*) FROM leads WHERE is_active = true AND (state = 'paused' OR state_system = 'paused') GROUP BY campaign_id`
   - If all leads are paused, they will be filtered out (this is expected behavior)

4. **Check unique company count:**
   - The UI filters out campaigns with ≤1 unique companies
   - If a campaign has only 1 unique company, it won't appear

## Data Flow Diagram

```
Frontend (Browser)
  ↓
  fetch('/api/push-activity')
  ↓
API Route (/api/push-activity/route.ts)
  ↓
  import("@/lib/supabase-helpers")
  ↓
  getCampaigns() → supabase.from('campaigns').select()
  ↓
  For each campaign:
    getUniqueCompaniesByCampaign() → supabase.from('leads').select()
    ↓
    Filter: is_active = true, company_name IS NOT NULL
    Filter: state != 'paused', state_system != 'paused'
    ↓
    Count unique companies
  ↓
  Filter campaigns: unique_company_count > 1
  ↓
  Return JSON response
  ↓
Frontend displays campaigns
```

## Testing Checklist

- [ ] Diagnostic endpoint (`/api/debug/diagnose`) returns success for all tests
- [ ] Environment variables are set in Vercel (all environments)
- [ ] Supabase project is active and accessible
- [ ] `campaigns` table has data with `is_active = true`
- [ ] `leads` table has data with `campaign_id` matching campaigns
- [ ] Leads have `company_name` values (not null)
- [ ] At least some leads are not paused (`state != 'paused'`)
- [ ] At least one campaign has >1 unique companies
- [ ] Browser console shows no errors
- [ ] Vercel function logs show successful queries

## Next Steps After Diagnosis

1. **If environment variables are missing:**
   - Add them to Vercel and redeploy

2. **If no data in Supabase:**
   - Run sync from local: `python3 push_activity.py --update-campaigns`
   - Or manually insert test data

3. **If connection errors:**
   - Verify Supabase credentials
   - Check Supabase project status
   - Review RLS policies

4. **If data exists but not showing:**
   - Check filtering logic (paused leads, unique company count)
   - Review console logs for specific errors
   - Check if campaigns meet display criteria (>1 unique companies)

## Debugging Commands

### Check Supabase Data (via SQL Editor in Supabase Dashboard)

```sql
-- Check campaigns
SELECT id, name, status, is_active, created_at 
FROM campaigns 
WHERE is_active = true 
ORDER BY name;

-- Check leads count per campaign
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  COUNT(l.id) as total_leads,
  COUNT(DISTINCT l.company_name) as unique_companies,
  COUNT(CASE WHEN l.state = 'paused' OR l.state_system = 'paused' THEN 1 END) as paused_leads
FROM campaigns c
LEFT JOIN leads l ON c.id = l.campaign_id AND l.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY c.name;

-- Check leads with company names (non-paused)
SELECT 
  campaign_id,
  COUNT(*) as total_leads,
  COUNT(DISTINCT company_name) as unique_companies
FROM leads
WHERE is_active = true
  AND company_name IS NOT NULL
  AND company_name != ''
  AND (state != 'paused' OR state IS NULL)
  AND (state_system != 'paused' OR state_system IS NULL)
GROUP BY campaign_id;
```

### Test API Endpoint Locally

```bash
# Start Next.js dev server
cd frontend
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/push-activity

# Test diagnostic endpoint
curl http://localhost:3000/api/debug/diagnose
```

## Contact Points

If issues persist after following this guide:

1. Check Vercel function logs for detailed error messages
2. Check Supabase Dashboard → Logs for database errors
3. Review browser console for client-side errors
4. Use the diagnostic endpoint to get a full status report

