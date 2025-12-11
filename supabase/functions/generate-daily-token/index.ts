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

    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log(`Generating Daily token for user ${user.id} and session ${sessionId}`);

    // Get session with video details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id, 
        coach_id, 
        client_id,
        session_state,
        session_video_details!inner(video_room_id, video_join_url, daily_room_name)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      throw new Error('Session not found');
    }

    // Determine user's role and get display name
    let role: 'coach' | 'client' | null = null;
    let displayName = 'Guest';
    let isOwner = false;

    // Check if user is the coach
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, name, user_id')
      .eq('id', session.coach_id)
      .single();

    if (coach?.user_id === user.id) {
      role = 'coach';
      displayName = coach.name || 'Coach';
      isOwner = true; // Coach is the meeting owner
      console.log('User is coach:', displayName);
    } else if (session.client_id === user.id) {
      // User is the client
      role = 'client';
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      displayName = profile?.full_name || 'Client';
      console.log('User is client:', displayName);
    }

    if (!role) {
      console.error('User not authorized for this session');
      throw new Error('You are not authorized to join this session');
    }

    // Get the room name - use daily_room_name or video_room_id
    const videoDetails = session.session_video_details;
    const roomName = videoDetails.daily_room_name || videoDetails.video_room_id;
    const roomUrl = videoDetails.video_join_url;

    if (!roomName) {
      throw new Error('Video room not found for this session');
    }

    console.log(`Creating meeting token for room ${roomName}, user ${displayName}, role ${role}`);

    // Generate Daily meeting token with user identity
    const tokenExpiry = Math.floor(Date.now() / 1000) + (4 * 60 * 60); // 4 hours from now
    
    const tokenPayload: any = {
      properties: {
        room_name: roomName,
        user_name: displayName,
        user_id: user.id,
        is_owner: isOwner,
        enable_recording: 'cloud',
        exp: tokenExpiry,
      }
    };

    // Coach auto-starts recording
    if (role === 'coach') {
      tokenPayload.properties.start_cloud_recording = true;
    }

    const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Daily token creation failed:', errorText);
      throw new Error(`Failed to create meeting token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const meetingToken = tokenData.token;

    // Build URL with token - no name prompt needed!
    const roomUrlWithToken = `${roomUrl}?t=${meetingToken}`;

    // Track participant token issuance
    await supabase
      .from('session_participants')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        role: role,
        display_name: displayName,
        meeting_token_issued_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,user_id'
      });

    console.log(`Token generated successfully for ${role} ${displayName}`);

    return new Response(
      JSON.stringify({
        success: true,
        roomUrlWithToken,
        roomUrl,
        displayName,
        role,
        isOwner,
        expiresAt: new Date(tokenExpiry * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating Daily token:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: error.message.includes('authorized') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
