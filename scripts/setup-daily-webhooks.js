#!/usr/bin/env node

/**
 * Setup Daily.co Webhooks Script
 * 
 * This script sets up webhooks in Daily.co to track session events
 * and send them to your Supabase function.
 */

const fetch = require('node-fetch');

// Configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nqoysxjjimvihcvfpesr.supabase.co';

if (!DAILY_API_KEY) {
  console.error('❌ DAILY_API_KEY environment variable is required');
  process.exit(1);
}

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/daily-webhook-handler`;

async function setupWebhooks() {
  console.log('🔧 Setting up Daily.co webhooks...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);

  try {
    // Check existing webhooks
    console.log('\n📋 Checking existing webhooks...');
    const existingResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!existingResponse.ok) {
      throw new Error(`Failed to fetch existing webhooks: ${existingResponse.status}`);
    }

    const existingData = await existingResponse.json();
    const existingWebhooks = existingData.data || [];
    
    console.log(`Found ${existingWebhooks.length} existing webhooks`);

    // Check if our webhook already exists
    const existingWebhook = existingWebhooks.find(webhook => webhook.url === WEBHOOK_URL);
    
    if (existingWebhook) {
      console.log(`✅ Webhook already exists (ID: ${existingWebhook.id})`);
      
      // Update the webhook to ensure it has all the events we need
      console.log('\n🔄 Updating existing webhook...');
      const updateResponse = await fetch(`https://api.daily.co/v1/webhooks/${existingWebhook.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTypes: getRequiredEvents(),
          url: WEBHOOK_URL,
          retryType: 'exponential'
        }),
      });

      if (updateResponse.ok) {
        const updatedWebhook = await updateResponse.json();
        console.log('✅ Webhook updated successfully');
        console.log(`📝 Webhook ID: ${updatedWebhook.id}`);
        console.log(`🔑 HMAC Secret: ${updatedWebhook.hmac}`);
        console.log(`📊 Events: ${updatedWebhook.eventTypes.join(', ')}`);
        return updatedWebhook;
      } else {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update webhook: ${errorText}`);
      }
    }

    // Create new webhook
    console.log('\n🆕 Creating new webhook...');
    const createResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        eventTypes: getRequiredEvents(),
        retryType: 'exponential'
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create webhook: ${errorText}`);
    }

    const newWebhook = await createResponse.json();
    console.log('✅ Webhook created successfully');
    console.log(`📝 Webhook ID: ${newWebhook.id}`);
    console.log(`🔑 HMAC Secret: ${newWebhook.hmac}`);
    console.log(`📊 Events: ${newWebhook.eventTypes.join(', ')}`);
    
    return newWebhook;

  } catch (error) {
    console.error('❌ Error setting up webhooks:', error.message);
    process.exit(1);
  }
}

function getRequiredEvents() {
  return [
    'meeting.started',
    'meeting.ended',
    'participant.joined',
    'participant.left',
    'recording.started',
    'recording.ready-to-download',
    'recording.error',
    'transcript.started',
    'transcript.ready-to-download',
    'transcript.error'
  ];
}

async function testWebhook() {
  console.log('\n🧪 Testing webhook endpoint...');
  
  try {
    const testResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test',
        data: { message: 'Webhook test from setup script' }
      }),
    });

    if (testResponse.ok) {
      console.log('✅ Webhook endpoint is accessible');
    } else {
      console.log(`⚠️  Webhook endpoint returned status: ${testResponse.status}`);
    }
  } catch (error) {
    console.log(`⚠️  Could not test webhook endpoint: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Daily.co Webhook Setup Script');
  console.log('================================\n');

  const webhook = await setupWebhooks();
  await testWebhook();

  console.log('\n🎉 Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Save the HMAC secret to your Supabase secrets:');
  console.log(`   supabase secrets set DAILY_WEBHOOK_SECRET="${webhook.hmac}"`);
  console.log('2. Deploy your Supabase functions:');
  console.log('   supabase functions deploy');
  console.log('3. Test a video session to verify webhook events are being received');
}

main().catch(console.error);
