-- ============================================================================
-- Mark All Existing Campaigns as Pushed
-- ============================================================================
-- This script marks all current companies for all active campaigns as "pushed"
-- so they won't appear in the "OPEN TO PUSH" view
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Insert all unique companies from active leads into pushed_companies
-- This will mark all existing companies as already pushed
INSERT INTO pushed_companies (campaign_id, company_name, pushed_at)
SELECT DISTINCT 
    l.campaign_id,
    l.company_name,
    NOW() as pushed_at
FROM leads l
INNER JOIN campaigns c ON l.campaign_id = c.id
WHERE 
    l.is_active = true
    AND c.is_active = true
    AND l.company_name IS NOT NULL
    AND l.company_name != ''
    -- Exclude paused leads (matching the logic in the application)
    AND (l.state_system IS NULL OR l.state_system != 'paused')
    AND (l.state IS NULL OR l.state != 'paused')
    -- Only insert if not already exists (due to UNIQUE constraint)
ON CONFLICT (campaign_id, company_name) DO NOTHING;

-- Verify the results
SELECT 
    c.name as campaign_name,
    COUNT(DISTINCT pc.company_name) as companies_marked_as_pushed,
    COUNT(DISTINCT l.company_name) as total_companies_in_campaign
FROM campaigns c
LEFT JOIN pushed_companies pc ON c.id = pc.campaign_id
LEFT JOIN leads l ON c.id = l.campaign_id 
    AND l.is_active = true 
    AND l.company_name IS NOT NULL 
    AND l.company_name != ''
    AND (l.state_system IS NULL OR l.state_system != 'paused')
    AND (l.state IS NULL OR l.state != 'paused')
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY c.name;

