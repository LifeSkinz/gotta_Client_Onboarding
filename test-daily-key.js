// Simple test script to verify Daily.co API key
const fetch = require('node-fetch');

async function testDailyKey() {
  const dailyApiKey = process.env.DAILY_API_KEY;
  
  if (!dailyApiKey) {
    console.error('❌ DAILY_API_KEY environment variable is not set');
    console.log('Please set your Daily.co API key in your environment variables');
    return;
  }

  console.log('🔑 Testing Daily.co API key...');
  console.log(`Key starts with: ${dailyApiKey.substring(0, 8)}...`);

  try {
    // Test the Daily.co API by fetching rooms
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Daily.co API key is valid!');
      console.log(`📊 Found ${data.data?.length || 0} existing rooms`);
      
      if (data.data && data.data.length > 0) {
        console.log('📋 Recent rooms:');
        data.data.slice(0, 3).forEach((room, index) => {
          console.log(`  ${index + 1}. ${room.name} (${room.url})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Daily.co API key test failed:');
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${errorText}`);
      
      if (response.status === 401) {
        console.error('🔐 This indicates an invalid API key');
      }
    }
  } catch (error) {
    console.error('❌ Network error testing Daily.co API:', error.message);
  }
}

testDailyKey();
