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

    // Get connection request details to create proper session
    const { data: requestData, error: requestError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', connectionRequestId)
      .single();

    if (requestError) {
      throw new Error(`Connection request not found: ${requestError.message}`);
    }

    // Generate unique session ID for VideoSDK
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create VideoSDK meeting room
    const videoRoomId = `room_${sessionId}`;
    const videoLink = `https://meet.videosdk.live/${videoRoomId}`;

    // Create session record in sessions table
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        session_id: sessionId,
        client_id: requestData.client_id,
        coach_id: requestData.coach_id,
        scheduled_time: requestData.request_type === 'instant' 
          ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
          : requestData.scheduled_time,
        video_room_id: videoRoomId,
        video_join_url: videoLink,
        duration_minutes: 60,
        status: requestData.request_type === 'instant' ? 'ready' : 'scheduled'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Update connection request with accepted status
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ 
        status: 'accepted',
        session_id: sessionData.id
      })
      .eq('id', connectionRequestId);

    if (updateError) {
      throw new Error(`Failed to update connection request: ${updateError.message}`);
    }

    console.log('Generated video link:', videoLink);
    console.log('Session ID:', sessionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoLink,
        sessionId: sessionData.id,
        sessionDbId: sessionData.id,
        roomId: videoRoomId,
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