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
    const { connectionRequestId, sessionId, justInTime } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let sessionData;

    if (justInTime && sessionId) {
      // Just-in-time video room creation for existing session
      const { data: existingSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !existingSession) {
        throw new Error(`Session not found: ${sessionError?.message}`);
      }

      sessionData = existingSession;
    } else if (connectionRequestId) {
      // Legacy flow: create session from connection request
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('id', connectionRequestId)
        .single();

      if (requestError) {
        throw new Error(`Connection request not found: ${requestError.message}`);
      }

      // Create session from connection request
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          client_id: requestData.client_id,
          coach_id: requestData.coach_id,
          scheduled_time: requestData.request_type === 'instant' 
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
            : requestData.scheduled_time,
          duration_minutes: 60,
          status: requestData.request_type === 'instant' ? 'ready' : 'scheduled'
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      sessionData = newSession;
    } else {
      throw new Error('Either connectionRequestId or sessionId is required');
    }

    // Generate unique video room for this session
    const videoRoomId = `room_${sessionData.id}_${Date.now()}`;
    const videoLink = `https://meet.videosdk.live/${videoRoomId}`;

    // Update session with video details
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        video_room_id: videoRoomId,
        video_join_url: videoLink,
        status: 'ready'
      })
      .eq('id', sessionData.id);

    if (updateError) {
      throw new Error(`Failed to update session with video details: ${updateError.message}`);
    }

    // Update connection request if applicable
    if (connectionRequestId) {
      await supabase
        .from('connection_requests')
        .update({ 
          status: 'accepted',
          session_id: sessionData.id
        })
        .eq('id', connectionRequestId);
    }

    console.log('Generated video link:', videoLink);
    console.log('Session ID:', sessionData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoLink,
        sessionId: sessionData.id,
        sessionDbId: sessionData.id,
        roomId: videoRoomId,
        message: 'Video room created successfully'
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