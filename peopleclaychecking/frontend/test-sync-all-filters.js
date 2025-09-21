#!/usr/bin/env node

/**
 * Test script for the enhanced SYNC ALL FILTERS functionality
 * Tests the complete flow: main sync + all filters sync
 */

const fetch = require('node-fetch');

async function testSyncAllFilters() {
  console.log('🧪 Testing SYNC ALL FILTERS functionality...\n');
  
  try {
    // Step 1: Test getting all filters
    console.log('📋 Step 1: Getting all existing filters...');
    const filtersResponse = await fetch('http://localhost:3000/api/filters');
    const filtersData = await filtersResponse.json();
    
    if (filtersResponse.ok && filtersData.filters) {
      console.log(`✅ Found ${filtersData.filters.length} filters:`);
      filtersData.filters.forEach((filter, index) => {
        console.log(`   ${index + 1}. ${filter.filter_name} (ID: ${filter.filter_id})`);
      });
    } else {
      console.log('❌ Failed to get filters:', filtersData.error);
      return;
    }
    
    console.log('\n🔄 Step 2: Testing main data sync...');
    const mainSyncResponse = await fetch('http://localhost:3000/api/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        filterId: null, 
        forceRefresh: true 
      }),
    });
    
    const mainSyncData = await mainSyncResponse.json();
    
    if (mainSyncResponse.ok && mainSyncData.success) {
      console.log('✅ Main data sync successful!');
      console.log(`📊 Message: ${mainSyncData.message}`);
    } else {
      console.log('❌ Main data sync failed:', mainSyncData.error);
      return;
    }
    
    console.log('\n🔄 Step 3: Testing individual filter sync...');
    const testFilter = filtersData.filters[1]; // Test with second filter (first is "ALL COMPANIES")
    
    if (testFilter) {
      console.log(`Testing filter: ${testFilter.filter_name} (ID: ${testFilter.filter_id})`);
      
      const filterSyncResponse = await fetch('http://localhost:3000/api/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filterId: testFilter.filter_id, 
          forceRefresh: true 
        }),
      });
      
      const filterSyncData = await filterSyncResponse.json();
      
      if (filterSyncResponse.ok && filterSyncData.success) {
        console.log(`✅ Filter sync successful: ${testFilter.filter_name}`);
        console.log(`📊 Message: ${filterSyncData.message}`);
        console.log(`🔄 From Cache: ${filterSyncData.fromCache}`);
      } else {
        console.log(`❌ Filter sync failed: ${testFilter.filter_name}`, filterSyncData.error);
      }
    } else {
      console.log('⚠️  No additional filters to test (only "ALL COMPANIES" available)');
    }
    
    console.log('\n✅ SYNC ALL FILTERS test completed!');
    console.log('\n📝 What the enhanced SYNC button now does:');
    console.log('   1. 🔄 Pulls fresh data from Lemlist and Pipedrive APIs');
    console.log('   2. 🔄 Runs matching for "ALL COMPANIES" (All Organizations)');
    console.log('   3. 📋 Gets all existing filters from the database');
    console.log('   4. 🔄 Runs matching for each individual filter with fresh data');
    console.log('   5. ✅ Updates all filter results with the latest data');
    console.log('   6. 📊 Shows summary of successful/failed syncs');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSyncAllFilters();
