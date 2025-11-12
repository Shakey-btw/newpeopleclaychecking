/**
 * Supabase Helper Functions
 * Common database operations for the application
 */

import { supabase } from './supabase';

// ============================================================================
// CAMPAIGNS
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  last_updated?: string;
  is_active?: boolean;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function upsertCampaign(campaign: Campaign): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .upsert(campaign, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// LEADS
// ============================================================================

export interface Lead {
  id: string;
  campaign_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  state?: string;
  state_system?: string;
  created_at?: string;
  last_updated?: string;
  is_active?: boolean;
}

export async function getLeadsByCampaign(campaignId: string): Promise<Lead[]> {
  // Paginate through all results since Supabase has a 1000 row limit
  const allLeads: Lead[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allLeads.push(...data);
      
      // If we got less than pageSize, we've reached the end
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return allLeads;
}

export async function getUniqueCompaniesByCampaign(campaignId: string): Promise<string[]> {
  // Paginate through all results since Supabase has a 1000 row limit
  const uniqueCompanies = new Set<string>();
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('leads')
      .select('company_name')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .not('company_name', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(lead => {
        if (lead.company_name) {
          uniqueCompanies.add(lead.company_name);
        }
      });
      
      // If we got less than pageSize, we've reached the end
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return Array.from(uniqueCompanies);
}

export async function getCampaignStats(campaignId: string) {
  // Get total count of leads (Supabase default limit is 1000, so we need to count)
  const { count: totalLeads, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('is_active', true);
  
  if (countError) throw countError;
  
  // Get unique companies - we need to paginate through all results
  // since Supabase has a 1000 row limit per query
  let uniqueCompanies = new Set<string>();
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('leads')
      .select('company_name')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .not('company_name', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(lead => {
        if (lead.company_name) {
          uniqueCompanies.add(lead.company_name);
        }
      });
      
      // If we got less than pageSize, we've reached the end
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  const totalLeadsCount = totalLeads || 0;
  const uniqueCompaniesCount = uniqueCompanies.size;
  
  return {
    total_leads: totalLeadsCount,
    unique_companies: uniqueCompaniesCount,
    ratio: uniqueCompaniesCount > 0 ? Math.round(totalLeadsCount / uniqueCompaniesCount) : 0
  };
}

// ============================================================================
// OVERVIEW DATA
// ============================================================================

export interface OverviewCampaign {
  id: string;
  name: string;
  status: string;
  unique_companies: number;
  total_leads: number;
  ratio: number;
}

export async function getOverviewData(): Promise<{
  campaigns: OverviewCampaign[];
  lastUpdate: string;
}> {
  // Get all active campaigns
  const campaigns = await getCampaigns();
  
  // Get stats for each campaign
  const overviewCampaigns: OverviewCampaign[] = await Promise.all(
    campaigns.map(async (campaign) => {
      const stats = await getCampaignStats(campaign.id);
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        unique_companies: stats.unique_companies,
        total_leads: stats.total_leads,
        ratio: stats.ratio
      };
    })
  );
  
  return {
    campaigns: overviewCampaigns,
    lastUpdate: new Date().toISOString()
  };
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export interface Organization {
  id: number;
  name?: string;
  owner_name?: string;
  cc_email?: string;
  address?: string;
  address_country?: string;
  created_at?: string;
  last_updated?: string;
  [key: string]: any; // For custom fields
}

export async function getOrganizations(limit: number = 100): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(limit)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function getChangeLog(limit: number = 50) {
  const { data, error } = await supabase
    .from('change_log')
    .select('*')
    .order('change_timestamp', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}


export async function getOrganizationById(id: number): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ============================================================================
// USER FILTERS
// ============================================================================

export interface UserFilter {
  id?: number;
  filter_id: string;
  filter_name: string;
  filter_url?: string;
  filter_conditions?: string;
  organizations_count?: number;
  created_at?: string;
  last_used?: string;
  is_active?: boolean;
}

export async function getUserFilters(): Promise<UserFilter[]> {
  const { data, error } = await supabase
    .from('user_filters')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// ============================================================================
// MATCHING DATA
// ============================================================================

export interface MatchingSummary {
  id: number;
  filter_id?: string;
  filter_name?: string;
  total_pipedrive_orgs?: number;
  total_lemlist_companies?: number;
  matching_companies?: number;
  match_percentage?: number;
  created_at?: string;
}

export async function getMatchingSummary(filterId?: string | null): Promise<MatchingSummary | null> {
  let query = supabase
    .from('matching_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (filterId === null || filterId === 'null' || filterId === '' || filterId === undefined) {
    query = query.is('filter_id', null);
  } else {
    query = query.eq('filter_id', filterId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data && data.length > 0 ? data[0] : null;
}

