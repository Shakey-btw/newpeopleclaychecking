#!/usr/bin/env node

/**
 * Test script for the SYNC button functionality
 * Tests the API endpoint that the SYNC button calls
 */

const fetch = require('node-fetch');

async function testSyncButton() {
  console.log('🧪 Testing SYNC button functionality...\n');
  
  try {
    // Test the API endpoint that the SYNC button calls
    const response = await fetch('http://localhost:3000/api/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        filterId: null, 
        forceRefresh: true 
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ SYNC API call successful!');
      console.log(`📊 Message: ${data.message}`);
      console.log(`🔄 From Cache: ${data.fromCache}`);
      console.log(`⚡ Force Refresh: ${data.forceRefresh}`);
      
      if (data.output) {
        console.log('\n📝 Backend Output:');
        console.log(data.output);
      }
    } else {
      console.log('❌ SYNC API call failed!');
      console.log(`Error: ${data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testSyncButton();
