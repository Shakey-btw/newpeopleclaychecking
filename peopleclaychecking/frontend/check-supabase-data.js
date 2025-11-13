#!/usr/bin/env node
/**
 * Script to check if there's data in Supabase tables for Push Activity
 * Run with: node check-supabase-data.js
 */

require('dotenv').config({ path: '../backend/.env' });

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment or use defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://micgjeldkzqxpexbxqfm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
  console.error('❌ ERROR: Supabase key not found!');
  console.error('Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseData() {
  console.log('='.repeat(60));
  console.log('Checking Supabase Data for Push Activity');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Supabase Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('');

  try {
    // Check campaigns table
    console.log('📊 Checking CAMPAIGNS table...');
    const { data: campaigns, error: campaignsError, count: campaignsCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .limit(10);

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
    } else {
      console.log(`✅ Found ${campaignsCount || campaigns?.length || 0} total campaigns`);
      
      const activeCampaigns = campaigns?.filter(c => c.is_active) || [];
      console.log(`   - Active campaigns: ${activeCampaigns.length}`);
      console.log(`   - Inactive campaigns: ${(campaignsCount || campaigns?.length || 0) - activeCampaigns.length}`);
      
      if (activeCampaigns.length > 0) {
        console.log('\n   Sample active campaigns:');
        activeCampaigns.slice(0, 5).forEach(c => {
          console.log(`   - ${c.name} (${c.id}) - Status: ${c.status}`);
        });
      }
    }

    console.log('');

    // Check leads table
    console.log('📊 Checking LEADS table...');
    const { data: leads, error: leadsError, count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .limit(10);

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
    } else {
      console.log(`✅ Found ${leadsCount || leads?.length || 0} total leads`);
      
      const activeLeads = leads?.filter(l => l.is_active) || [];
      console.log(`   - Active leads: ${activeLeads.length}`);
      console.log(`   - Inactive leads: ${(leadsCount || leads?.length || 0) - activeLeads.length}`);
      
      // Count leads by campaign
      if (activeLeads.length > 0) {
        const leadsByCampaign = {};
        activeLeads.forEach(lead => {
          if (!leadsByCampaign[lead.campaign_id]) {
            leadsByCampaign[lead.campaign_id] = {
              total: 0,
              withCompany: 0,
              paused: 0,
            };
          }
          leadsByCampaign[lead.campaign_id].total++;
          if (lead.company_name) {
            leadsByCampaign[lead.campaign_id].withCompany++;
          }
          if (lead.state === 'paused' || lead.state_system === 'paused') {
            leadsByCampaign[lead.campaign_id].paused++;
          }
        });
        
        console.log(`\n   Leads by campaign (showing first 5):`);
        Object.entries(leadsByCampaign).slice(0, 5).forEach(([campaignId, stats]) => {
          console.log(`   - Campaign ${campaignId}:`);
          console.log(`     * Total leads: ${stats.total}`);
          console.log(`     * With company name: ${stats.withCompany}`);
          console.log(`     * Paused: ${stats.paused}`);
        });
      }
    }

    console.log('');

    // Check unique companies per campaign
    console.log('📊 Checking UNIQUE COMPANIES per campaign...');
    if (campaigns && campaigns.length > 0) {
      for (const campaign of campaigns.slice(0, 5)) {
        if (!campaign.is_active) continue;
        
        const { data: campaignLeads, error: campaignLeadsError } = await supabase
          .from('leads')
          .select('company_name, state, state_system')
          .eq('campaign_id', campaign.id)
          .eq('is_active', true)
          .not('company_name', 'is', null);

        if (!campaignLeadsError && campaignLeads) {
          const uniqueCompanies = new Set();
          let pausedCount = 0;
          
          campaignLeads.forEach(lead => {
            if (lead.state_system === 'paused' || lead.state === 'paused') {
              pausedCount++;
            } else if (lead.company_name) {
              uniqueCompanies.add(lead.company_name);
            }
          });
          
          console.log(`   - ${campaign.name}:`);
          console.log(`     * Unique companies (non-paused): ${uniqueCompanies.size}`);
          console.log(`     * Paused leads: ${pausedCount}`);
          console.log(`     * Will show in UI: ${uniqueCompanies.size > 1 ? 'YES ✅' : 'NO ❌ (≤1 unique companies)'}`);
        }
      }
    }

    console.log('');

    // Check change_log table
    console.log('📊 Checking CHANGE_LOG table...');
    const { data: changeLog, error: changeLogError, count: changeLogCount } = await supabase
      .from('change_log')
      .select('*', { count: 'exact' })
      .order('change_timestamp', { ascending: false })
      .limit(10);

    if (changeLogError) {
      console.error('❌ Error fetching change log:', changeLogError);
    } else {
      console.log(`✅ Found ${changeLogCount || changeLog?.length || 0} change log entries`);
      if (changeLog && changeLog.length > 0) {
        console.log('\n   Recent entries:');
        changeLog.slice(0, 5).forEach(entry => {
          console.log(`   - ${entry.change_type} - ${entry.campaign_name || 'N/A'} - ${entry.change_timestamp}`);
        });
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    
    const totalCampaigns = campaignsCount || campaigns?.length || 0;
    const activeCampaignsCount = campaigns?.filter(c => c.is_active).length || 0;
    const totalLeads = leadsCount || leads?.length || 0;
    const activeLeadsCount = leads?.filter(l => l.is_active).length || 0;
    
    console.log(`Total campaigns: ${totalCampaigns}`);
    console.log(`Active campaigns: ${activeCampaignsCount}`);
    console.log(`Total leads: ${totalLeads}`);
    console.log(`Active leads: ${activeLeadsCount}`);
    
    if (activeCampaignsCount === 0) {
      console.log('\n⚠️  WARNING: No active campaigns found!');
      console.log('   This is why push activity shows no data.');
      console.log('   Run: python3 push_activity.py --update-campaigns');
    } else if (activeLeadsCount === 0) {
      console.log('\n⚠️  WARNING: No active leads found!');
      console.log('   Campaigns exist but have no leads.');
      console.log('   Run: python3 push_activity.py --update-campaigns');
    } else {
      console.log('\n✅ Data exists in Supabase!');
      console.log('   If push activity still shows no data, check:');
      console.log('   1. Environment variables in Vercel');
      console.log('   2. Browser console for errors');
      console.log('   3. /api/debug/diagnose endpoint');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

checkSupabaseData();

