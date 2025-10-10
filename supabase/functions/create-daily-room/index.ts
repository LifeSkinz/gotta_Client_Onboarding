import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    // Check if room already exists
    if (session.video_join_url) {
      console.log('Room already exists for session:', sessionId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          room_url: session.video_join_url,
          room_name: session.video_room_id || 'existing-room',
          message: 'Room already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let roomUrl = '';
    let roomName = '';

    if (dailyApiKey) {
      // Create Daily.co room with proper config
      console.log('Creating Daily.co room for session:', sessionId);
      console.log('Daily API Key present:', dailyApiKey ? 'Yes' : 'No');
      
      const roomConfig = {
        name: `session-${sessionId}-${Date.now()}`,
        config: {
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

      console.log('Sending request to Daily.co API with config:', JSON.stringify(roomConfig, null, 2));

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
        console.error('Daily.co API status:', dailyResponse.status);
        console.error('Daily.co API headers:', Object.fromEntries(dailyResponse.headers.entries()));
        
        if (dailyResponse.status === 401) {
          console.error('AUTHENTICATION ERROR: Daily API key is invalid or expired');
          console.error('Please verify the DAILY_API_KEY secret in Supabase');
        }
        
        // Fall back to VideoSDK on Daily.co failure
        console.log('Falling back to VideoSDK due to Daily.co error');
        roomName = `fallback-room-${sessionId}-${Date.now()}`;
        roomUrl = `https://meet.videosdk.live/${roomName}`;
      } else {
        const roomData = await dailyResponse.json();
        roomUrl = roomData.url;
        roomName = roomData.name;
        console.log('Created Daily.co room:', roomName, 'URL:', roomUrl);
      }
    } else {
      // Fallback to VideoSDK when no Daily API key
      console.log('No Daily API key found, using VideoSDK fallback for session:', sessionId);
      roomName = `fallback-room-${sessionId}-${Date.now()}`;
      roomUrl = `https://meet.videosdk.live/${roomName}`;
      console.log('Generated fallback URL:', roomUrl);
      
      // Validate fallback URL is reachable
      try {
        const testResponse = await fetch(roomUrl, { method: 'HEAD' });
        console.log('Fallback URL validation response:', testResponse.status);
        if (!testResponse.ok) {
          console.warn('Warning: Fallback URL may not be reachable:', roomUrl);
        }
      } catch (err) {
        console.warn('Could not validate fallback URL:', err.message);
      }
    }

    // Update session state
    const { error: stateUpdateError } = await supabase
      .from('sessions')
      .update({
        session_state: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (stateUpdateError) {
      console.error('Warning: Failed to update session state:', stateUpdateError);
    }

    // Upsert video details into session_video_details table
    const { error: videoDetailsError } = await supabase
      .from('session_video_details')
      .upsert({
        session_id: sessionId,
        video_room_id: roomName,
        video_join_url: roomUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      });

    if (videoDetailsError) {
      throw new Error(`Failed to save video details: ${videoDetailsError.message}`);
    }

    // Initialize transcription status
    const { error: recordingError } = await supabase
      .from('session_recordings')
      .upsert({
        session_id: sessionId,
        transcription_status: 'inactive',
        transcription_paused_segments: [],
        privacy_settings: {
          auto_redact_pauses: true,
          retain_original: false,
          redaction_method: 'silence'
        }
      }, {
        onConflict: 'session_id'
      });

    if (recordingError) {
      console.error('Warning: Failed to initialize recording:', recordingError);
    }

    console.log('Successfully created room for session:', sessionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        room_url: roomUrl,
        room_name: roomName,
        session_id: sessionId,
        transcription_enabled: !!dailyApiKey,
        message: 'Room created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Daily room:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});