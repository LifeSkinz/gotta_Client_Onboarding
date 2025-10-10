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

    // Only return the first few characters for security
    const maskedKey = dailyApiKey.substring(0, 8) + '...';

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Daily.co API key is configured',
        maskedKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});