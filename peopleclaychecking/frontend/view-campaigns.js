#!/usr/bin/env node

/**
 * View all Lemlist campaigns pulled from the database
 */

const sqlite3 = require('sqlite3');
const path = require('path');

function viewCampaigns() {
  console.log('📧 All Lemlist Campaigns\n');
  console.log('=' * 60);
  
  const dbPath = path.join(__dirname, '../backend/lemlist_campaigns.db');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      return;
    }
    
    console.log('✅ Connected to Lemlist campaigns database\n');
    
    // Get campaigns overview
    db.all(`
      SELECT 
        id,
        name,
        status,
        leads_count,
        columns_count,
        created_at,
        last_updated
      FROM campaigns_overview 
      ORDER BY created_at DESC
    `, (err, campaigns) => {
      if (err) {
        console.error('❌ Failed to get campaigns:', err.message);
        return;
      }
      
      if (!campaigns || campaigns.length === 0) {
        console.log('❌ No campaigns found in database');
        return;
      }
      
      console.log(`📊 Found ${campaigns.length} campaigns:\n`);
      
      campaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name}`);
        console.log(`   📋 Campaign ID: ${campaign.id}`);
        console.log(`   🟢 Status: ${campaign.status}`);
        console.log(`   👥 Leads Count: ${campaign.leads_count.toLocaleString()}`);
        console.log(`   📊 Columns Count: ${campaign.columns_count}`);
        console.log(`   📅 Created: ${campaign.created_at}`);
        console.log(`   🔄 Last Updated: ${campaign.last_updated}`);
        console.log('');
      });
      
      // Get total statistics
      const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads_count, 0);
      const totalColumns = campaigns.reduce((sum, campaign) => sum + campaign.columns_count, 0);
      const runningCampaigns = campaigns.filter(c => c.status === 'running').length;
      
      console.log('📊 SUMMARY STATISTICS:');
      console.log('=' * 30);
      console.log(`📧 Total Campaigns: ${campaigns.length}`);
      console.log(`🟢 Running Campaigns: ${runningCampaigns}`);
      console.log(`👥 Total Leads: ${totalLeads.toLocaleString()}`);
      console.log(`📊 Average Leads per Campaign: ${Math.round(totalLeads / campaigns.length).toLocaleString()}`);
      console.log(`📊 Total Columns: ${totalColumns.toLocaleString()}`);
      
      // Show campaign breakdown by status
      const statusBreakdown = campaigns.reduce((acc, campaign) => {
        acc[campaign.status] = (acc[campaign.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 CAMPAIGNS BY STATUS:');
      console.log('=' * 30);
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} campaigns`);
      });
      
      console.log('\n💡 To view detailed data for a specific campaign:');
      console.log('   1. Use the approach page to see company matching');
      console.log('   2. Check the backend database directly');
      console.log('   3. Use the push-activity page to see campaign activity');
      
      db.close();
    });
  });
}

// Run the script
viewCampaigns();
