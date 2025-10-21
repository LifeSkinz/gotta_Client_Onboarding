import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY is not set');
    }

    // Get the webhook URL from environment or construct it
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/daily-webhook-handler`;

    console.log('Setting up Daily.co webhooks...');
    console.log('Webhook URL:', webhookUrl);

    // Define the events we want to track
    const eventsToTrack = [
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

    // First, check if webhooks already exist
    const existingWebhooksResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (existingWebhooksResponse.ok) {
      const existingWebhooks = await existingWebhooksResponse.json();
      console.log(`Found ${existingWebhooks.data?.length || 0} existing webhooks`);
      
      // Check if our webhook already exists
      const existingWebhook = existingWebhooks.data?.find((webhook: any) => 
        webhook.url === webhookUrl
      );

      if (existingWebhook) {
        console.log('Webhook already exists:', existingWebhook.id);
        
        // Update the existing webhook to ensure it has all the events we need
        const updateResponse = await fetch(`https://api.daily.co/v1/webhooks/${existingWebhook.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventTypes: eventsToTrack,
            url: webhookUrl
          }),
        });

        if (updateResponse.ok) {
          const updatedWebhook = await updateResponse.json();
          console.log('Webhook updated successfully');
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Webhook updated successfully',
              webhookId: updatedWebhook.id,
              events: eventsToTrack,
              url: webhookUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await updateResponse.text();
          console.error('Failed to update webhook:', errorText);
          throw new Error(`Failed to update webhook: ${errorText}`);
        }
      }
    }

    // Create a new webhook
    const webhookPayload = {
      url: webhookUrl,
      eventTypes: eventsToTrack,
      retryType: 'exponential', // Use exponential backoff for better reliability
      basicAuth: null // We'll use HMAC verification instead
    };

    console.log('Creating new webhook with payload:', JSON.stringify(webhookPayload, null, 2));

    const createResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Failed to create webhook:', errorText);
      throw new Error(`Failed to create webhook: ${errorText}`);
    }

    const newWebhook = await createResponse.json();
    console.log('Webhook created successfully:', newWebhook.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook created successfully',
        webhookId: newWebhook.id,
        hmacSecret: newWebhook.hmac,
        events: eventsToTrack,
        url: webhookUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up webhooks:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
