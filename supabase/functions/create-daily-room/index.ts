import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withAdvisoryLock } from '../_shared/advisory-lock.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, idempotencyKey } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Creating room for session ${sessionId}, idempotency key: ${idempotencyKey || 'none'}`);

    // Use advisory lock to prevent duplicate room creation
    const lockKey = `daily_room_create:${sessionId}`;
    
    const result = await withAdvisoryLock(supabase, lockKey, async () => {
      // IDEMPOTENCY: Check if room already exists
      const { data: existingVideo } = await supabase
        .from('session_video_details')
        .select('video_room_id, video_join_url')
        .eq('session_id', sessionId)
        .single();

      if (existingVideo?.video_join_url) {
        console.log('Room already exists for session (idempotent return):', sessionId);
        return {
          success: true,
          room_url: existingVideo.video_join_url,
          room_name: existingVideo.video_room_id || 'existing-room',
          videoJoinUrl: existingVideo.video_join_url,
          videoRoomId: existingVideo.video_room_id || 'existing-room',
          idempotent: true,
          message: 'Room already exists'
        };
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        throw new Error(`Session not found: ${sessionError.message}`);
      }

      let roomUrl = '';
      let roomName = '';

      if (dailyApiKey) {
        // Create Daily.co room with proper config
        console.log('Creating Daily.co room for session:', sessionId);
        
        const roomConfig = {
          name: `session-${sessionId}-${Date.now()}`,
          properties: {
            exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours from now
            nbf: Math.floor(Date.now() / 1000), // not before (now)
            max_participants: 2,
            enable_recording: "cloud",
            start_video_off: false,
            start_audio_off: false,
            enable_screenshare: true,
            enable_chat: true
          }
        };

        const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roomConfig),
        });

        if (!dailyResponse.ok) {
          const errorText = await dailyResponse.text();
          console.error('Daily.co API error:', errorText);
          throw new Error(`Failed to create Daily room: ${errorText}`);
        }

        const roomData = await dailyResponse.json();
        roomUrl = roomData.url;
        roomName = roomData.name;
        console.log('Daily.co room created successfully:', roomName);
      } else {
        // Fallback to VideoSDK URL
        console.log('No Daily API key, using VideoSDK fallback');
        const videoSdkKey = Deno.env.get('VIDEOSDK_KEY');
        if (!videoSdkKey) {
          throw new Error('Neither DAILY_API_KEY nor VIDEOSDK_KEY is configured');
        }
        roomName = `session-${sessionId}`;
        roomUrl = `https://videosdk.live/room/${roomName}`;
      }

      // Update session state to 'ready' using RPC
      await supabase.rpc('update_session_state', {
        p_session_id: sessionId,
        p_new_state: 'ready',
        p_locked_by: 'create-daily-room',
        p_reason: 'Video room created',
        p_metadata: { videoRoomId: roomName }
      });

      // Store video details
      await supabase
        .from('session_video_details')
        .upsert({
          session_id: sessionId,
          video_room_id: roomName,
          video_join_url: roomUrl,
          video_provider: dailyApiKey ? 'daily' : 'videosdk'
        });

      // Initialize recording settings
      await supabase
        .from('session_recordings')
        .upsert({
          session_id: sessionId,
          recording_status: 'initialized',
          transcription_enabled: true
        });

      console.log(`Room created successfully for session ${sessionId}: ${roomUrl}`);

      return {
        success: true,
        room_url: roomUrl,
        room_name: roomName,
        videoJoinUrl: roomUrl,
        videoRoomId: roomName
      };
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-daily-room:', error);
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
