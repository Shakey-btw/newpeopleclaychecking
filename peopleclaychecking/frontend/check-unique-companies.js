#!/usr/bin/env node
/**
 * Detailed check of unique companies per campaign
 */

require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://micgjeldkzqxpexbxqfm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUniqueCompanies() {
  console.log('Checking unique companies per active campaign...\n');

  // Get active campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true);

  if (!campaigns || campaigns.length === 0) {
    console.log('No active campaigns found!');
    return;
  }

  for (const campaign of campaigns) {
    console.log(`\n📋 Campaign: ${campaign.name} (${campaign.id})`);
    console.log('─'.repeat(60));

    // Get all leads for this campaign (paginated)
    let allLeads = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('leads')
        .select('company_name, state, state_system')
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error: ${error.message}`);
        break;
      }

      if (data && data.length > 0) {
        allLeads.push(...data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`Total active leads: ${allLeads.length}`);

    // Filter out paused leads and count unique companies
    const uniqueCompanies = new Set();
    let pausedCount = 0;
    let noCompanyName = 0;
    const companyList = [];

    allLeads.forEach(lead => {
      if (lead.state_system === 'paused' || lead.state === 'paused') {
        pausedCount++;
        return;
      }

      if (!lead.company_name || lead.company_name.trim() === '') {
        noCompanyName++;
        return;
      }

      const companyName = lead.company_name.trim();
      uniqueCompanies.add(companyName);
      companyList.push(companyName);
    });

    console.log(`Paused leads (excluded): ${pausedCount}`);
    console.log(`Leads without company name: ${noCompanyName}`);
    console.log(`Unique companies (non-paused): ${uniqueCompanies.size}`);
    
    if (uniqueCompanies.size > 0) {
      console.log(`\nUnique companies:`);
      Array.from(uniqueCompanies).forEach((company, idx) => {
        const count = companyList.filter(c => c === company).length;
        console.log(`  ${idx + 1}. ${company} (${count} lead${count > 1 ? 's' : ''})`);
      });
    }

    console.log(`\n✅ Will show in UI: ${uniqueCompanies.size > 1 ? 'YES' : 'NO ❌ (≤1 unique companies)'}`);
  }
}

checkUniqueCompanies();

