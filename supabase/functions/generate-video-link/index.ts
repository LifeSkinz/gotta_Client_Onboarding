import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionRequestId } = await req.json();

    if (!connectionRequestId) {
      throw new Error('Connection request ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique session ID for VideoSDK
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, we'll create a placeholder video link
    // TODO: Integrate with VideoSDK.live API to create actual meeting room
    const videoLink = `https://meet.videosdk.live/${sessionId}`;

    // Update connection request with video link
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ 
        video_link: videoLink,
        status: 'accepted'
      })
      .eq('id', connectionRequestId);

    if (updateError) {
      throw new Error(`Failed to update connection request: ${updateError.message}`);
    }

    // Create video session record
    const { error: sessionError } = await supabase
      .from('video_sessions')
      .insert({
        connection_request_id: connectionRequestId,
        session_id: sessionId,
        status: 'scheduled'
      });

    if (sessionError) {
      throw new Error(`Failed to create video session: ${sessionError.message}`);
    }

    console.log('Generated video link:', videoLink);
    console.log('Session ID:', sessionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoLink,
        sessionId,
        message: 'Video link generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-video-link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});