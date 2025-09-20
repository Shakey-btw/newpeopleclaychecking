// Test script for Push Activity API endpoints
const baseUrl = 'http://localhost:3000';

async function testPushActivityAPI() {
  console.log('🧪 Testing Push Activity API...\n');

  try {
    // Test GET /api/push-activity
    console.log('1. Testing GET /api/push-activity...');
    const campaignsResponse = await fetch(`${baseUrl}/api/push-activity`);
    const campaignsData = await campaignsResponse.json();
    
    if (campaignsData.success) {
      console.log('✅ GET /api/push-activity successful');
      console.log(`📊 Found ${campaignsData.campaigns.length} campaigns`);
      campaignsData.campaigns.forEach((campaign, index) => {
        console.log(`   ${index + 1}. ${campaign.name} (${campaign.status}) - ${campaign.unique_company_count} companies`);
      });
    } else {
      console.log('❌ GET /api/push-activity failed:', campaignsData.error);
    }

    console.log('\n2. Testing GET /api/push-activity/changelog...');
    const changelogResponse = await fetch(`${baseUrl}/api/push-activity/changelog?limit=10`);
    const changelogData = await changelogResponse.json();
    
    if (changelogData.success) {
      console.log('✅ GET /api/push-activity/changelog successful');
      console.log(`📊 Found ${changelogData.changeLog.length} change log entries`);
      changelogData.changeLog.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.change_type} - ${entry.campaign_name || 'N/A'}${entry.details ? ` (${entry.details})` : ''}`);
      });
    } else {
      console.log('❌ GET /api/push-activity/changelog failed:', changelogData.error);
    }

    console.log('\n3. Testing POST /api/push-activity (update)...');
    const updateResponse = await fetch(`${baseUrl}/api/push-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'update' }),
    });
    const updateData = await updateResponse.json();
    
    if (updateData.success) {
      console.log('✅ POST /api/push-activity successful');
      console.log(`📊 Update stats:`, updateData.stats);
    } else {
      console.log('❌ POST /api/push-activity failed:', updateData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPushActivityAPI();
