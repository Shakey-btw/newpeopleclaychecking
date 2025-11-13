-- Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- ============================================================================
-- 1. ORGANIZATIONS (from Pipedrive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY,
    name TEXT,
    owner_name TEXT,
    cc_email TEXT,
    address TEXT,
    address_subpremise TEXT,
    address_street_number TEXT,
    address_route TEXT,
    address_sublocality TEXT,
    address_locality TEXT,
    address_admin_area_level_1 TEXT,
    address_admin_area_level_2 TEXT,
    address_country TEXT,
    address_postal_code TEXT,
    address_formatted_address TEXT,
    open_deals_count INTEGER,
    related_open_deals_count INTEGER,
    closed_deals_count INTEGER,
    related_closed_deals_count INTEGER,
    participant_open_deals_count INTEGER,
    participant_closed_deals_count INTEGER,
    email_messages_count INTEGER,
    activities_count INTEGER,
    done_activities_count INTEGER,
    undone_activities_count INTEGER,
    files_count INTEGER,
    notes_count INTEGER,
    followers_count INTEGER,
    won_deals_count INTEGER,
    related_won_deals_count INTEGER,
    related_lost_deals_count INTEGER,
    visible_to TEXT,
    picture_id TEXT,
    next_activity_date DATE,
    next_activity_time TEXT,
    next_activity_id INTEGER,
    last_activity_id INTEGER,
    last_activity_date DATE,
    last_incoming_mail_time TIMESTAMPTZ,
    last_outgoing_mail_time TIMESTAMPTZ,
    label INTEGER,
    country_code TEXT,
    first_char TEXT,
    update_time TIMESTAMPTZ,
    add_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CAMPAIGNS (from Lemlist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- 3. LEADS (from Lemlist campaigns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    job_title TEXT,
    linkedin_url TEXT,
    state TEXT,
    state_system TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- ============================================================================
-- 4. USER FILTERS (Pipedrive filters)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_filters (
    id SERIAL PRIMARY KEY,
    filter_id TEXT UNIQUE NOT NULL,
    filter_name TEXT NOT NULL,
    filter_url TEXT,
    filter_conditions TEXT,
    organizations_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- 5. FILTERED ORGANIZATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS filtered_organizations (
    id SERIAL PRIMARY KEY,
    filter_id TEXT NOT NULL REFERENCES user_filters(filter_id) ON DELETE CASCADE,
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(filter_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_filtered_orgs_filter_id ON filtered_organizations(filter_id);
CREATE INDEX IF NOT EXISTS idx_filtered_orgs_org_id ON filtered_organizations(org_id);

-- ============================================================================
-- 6. MATCHING SUMMARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS matching_summary (
    id SERIAL PRIMARY KEY,
    filter_id TEXT,
    filter_name TEXT,
    total_pipedrive_orgs INTEGER,
    total_lemlist_companies INTEGER,
    total_lemlist_companies_unique INTEGER,
    matching_companies INTEGER,
    non_matching_pipedrive INTEGER,
    non_matching_lemlist INTEGER,
    match_percentage REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(filter_id)
);

-- ============================================================================
-- 7. DETAILED MATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS detailed_matches (
    id SERIAL PRIMARY KEY,
    filter_id TEXT,
    pipedrive_org_name TEXT,
    lemlist_company_name TEXT,
    campaign_name TEXT,
    campaign_id TEXT,
    match_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detailed_matches_filter_id ON detailed_matches(filter_id);

-- ============================================================================
-- 8. CHANGE LOG (for push activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS change_log (
    id SERIAL PRIMARY KEY,
    change_type TEXT NOT NULL, -- 'campaign_added', 'campaign_removed', 'lead_added', 'lead_removed', 'lead_updated'
    campaign_id TEXT,
    campaign_name TEXT,
    lead_id TEXT,
    lead_email TEXT,
    lead_company TEXT,
    old_value TEXT,
    new_value TEXT,
    change_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_log_timestamp ON change_log(change_timestamp);
CREATE INDEX IF NOT EXISTS idx_change_log_campaign_id ON change_log(campaign_id);

-- ============================================================================
-- 9. FILTER CONDITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS filter_conditions (
    filter_id TEXT PRIMARY KEY,
    filter_name TEXT,
    filter_url TEXT,
    conditions_json TEXT,
    field_mappings TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced TIMESTAMPTZ
);

-- ============================================================================
-- 10. ORGANIZATION CUSTOM FIELDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_custom_fields (
    org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (org_id, field_key)
);

-- ============================================================================
-- 11. PUSHED COMPANIES (for push activity tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pushed_companies (
    id SERIAL PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    pushed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, company_name)
);

CREATE INDEX IF NOT EXISTS idx_pushed_companies_campaign_id ON pushed_companies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pushed_companies_company_name ON pushed_companies(company_name);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable if needed
-- ============================================================================
-- Uncomment these if you want to enable Row Level Security
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (allow all for now - customize as needed):
-- CREATE POLICY "Allow all operations" ON organizations FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON campaigns FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON leads FOR ALL USING (true);

