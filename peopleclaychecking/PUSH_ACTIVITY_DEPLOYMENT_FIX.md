# Push Activity Deployment Issue - Analysis & Fix

## Problem Summary

Push activity data shows correctly in the local version but not in the deployed version on Vercel.

## Root Cause Analysis

### Architecture Overview

1. **Local Development:**
   - Uses Python script (`push_activity.py`) that queries SQLite database
   - Python script filters out paused leads: `state != 'paused' AND state_system != 'paused'`
   - Falls back to Supabase if Python script fails

2. **Deployed Version (Vercel):**
   - Cannot run Python scripts (no Python runtime in Vercel serverless functions)
   - Must use Supabase directly via API routes
   - Supabase queries were **NOT filtering out paused leads**

### The Issue

The Python script in `push_activity.py` (lines 1150-1156) filters out paused leads:
```python
SELECT COUNT(DISTINCT company_name) FROM leads 
WHERE campaign_id = ? AND is_active = 1 
AND (state_system != 'paused' OR state_system IS NULL)
AND (state != 'paused' OR state IS NULL)
AND company_name IS NOT NULL AND company_name != ''
```

However, the Supabase helper functions in `supabase-helpers.ts` were only filtering by:
- `is_active = true`
- `company_name IS NOT NULL`

**Missing filter:** Leads with `state = 'paused'` or `state_system = 'paused'` were being included in the deployed version, causing:
- Incorrect company counts
- Campaigns appearing/disappearing incorrectly
- Data mismatch between local and deployed versions

## Files Affected

1. **`frontend/src/lib/supabase-helpers.ts`**
   - `getUniqueCompaniesByCampaign()` - Missing paused lead filter
   - `getCampaignStats()` - Missing paused lead filter in both count and unique companies

2. **`frontend/src/app/api/push-activity/route.ts`**
   - Uses Supabase helpers, which now correctly filter paused leads

## Solution Implemented

### Changes Made

1. **Updated `getUniqueCompaniesByCampaign()`:**
   - Added `state` and `state_system` to SELECT query
   - Added filter logic to skip leads where `state_system === 'paused'` or `state === 'paused'`
   - Matches Python script logic exactly

2. **Updated `getCampaignStats()`:**
   - Changed from using count query to fetching all leads and filtering manually
   - Added paused lead filtering in both total leads count and unique companies calculation
   - Ensures consistency with Python script behavior

### Code Changes

```typescript
// Before: Only filtered by is_active and company_name
.eq('is_active', true)
.not('company_name', 'is', null)

// After: Also filters out paused leads
data.forEach(lead => {
  // Skip paused leads (matching Python script logic)
  if (lead.state_system === 'paused' || lead.state === 'paused') {
    return;
  }
  // ... process lead
});
```

## Testing Checklist

- [ ] Verify campaigns show correct unique company counts in deployed version
- [ ] Compare counts between local (Python) and deployed (Supabase) versions
- [ ] Ensure campaigns with only paused leads don't appear
- [ ] Verify change log displays correctly
- [ ] Test push activity functionality end-to-end

## Deployment Notes

1. **Environment Variables Required:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Must be set in Vercel
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Must be set in Vercel

2. **No Database Migration Needed:**
   - This is a query logic fix, not a schema change
   - Existing data in Supabase is correct

3. **Backward Compatibility:**
   - Local development still works with Python fallback
   - Deployed version now matches local behavior

## Additional Observations

### Connection Flow

1. **Frontend → API Route:**
   - `/api/push-activity` tries Supabase first
   - Falls back to Python script only in local development

2. **Supabase Connection:**
   - Uses `@supabase/supabase-js` client
   - Environment variables from `NEXT_PUBLIC_SUPABASE_*`
   - Client initialized in `src/lib/supabase.ts`

3. **Backend → Supabase:**
   - Python backend writes to both SQLite and Supabase
   - `push_activity.py` uses `supabase_client.py` for Supabase writes
   - Dual-write ensures data consistency

### Potential Future Improvements

1. **Database-Level Filtering:**
   - Consider adding a computed column or view that excludes paused leads
   - Would improve query performance

2. **Consolidation:**
   - Consider removing SQLite fallback entirely and using Supabase for all environments
   - Would simplify codebase and ensure consistency

3. **Caching:**
   - Add caching layer for campaign stats to reduce Supabase query load
   - Use Next.js cache or Redis for frequently accessed data

## Verification Steps

After deployment, verify:

1. Check browser console for any Supabase connection errors
2. Compare campaign counts between local and deployed
3. Verify unique company counts match expected values
4. Test with campaigns that have paused leads to ensure they're excluded

## Related Files

- `backend/push_activity.py` - Python script with correct filtering logic
- `frontend/src/lib/supabase-helpers.ts` - Fixed Supabase queries
- `frontend/src/app/api/push-activity/route.ts` - API route using helpers
- `frontend/src/app/push-activity/page.tsx` - Frontend component

