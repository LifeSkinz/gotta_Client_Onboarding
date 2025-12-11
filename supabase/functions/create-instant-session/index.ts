import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request body
    const requestSchema = z.object({
      coachId: z.string().uuid("Coach ID must be a valid UUID"),
      clientId: z.string().uuid("Client ID must be a valid UUID"),
      userGoal: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        icon: z.string()
      }),
      clientBio: z.string().optional()
    });
    
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("Validation failed:", validation.error.issues);
      return new Response(
        JSON.stringify({ error: "Invalid request: " + validation.error.issues[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { coachId, clientId, userGoal, clientBio } = validation.data;
    console.log('Creating instant session (Google Meet style):', { coachId, clientId });

    // Get coach details
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('name, notification_email, notification_phone')
      .eq('id', coachId)
      .single();

    if (coachError || !coach) {
      console.error('Coach not found:', coachError);
      return new Response(
        JSON.stringify({ error: 'Coach not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 1: Create the Daily.co room IMMEDIATELY (like Google Meet)
    let videoJoinUrl = '';
    let videoRoomId = '';

    if (dailyApiKey) {
      const roomName = `session-${crypto.randomUUID().slice(0, 8)}-${Date.now()}`;
      const roomConfig = {
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
          max_participants: 2,
          enable_recording: "cloud",
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false
        }
      };

      console.log('Creating Daily.co room immediately:', roomName);
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
        throw new Error(`Failed to create video room: ${errorText}`);
      }

      const roomData = await dailyResponse.json();
      videoJoinUrl = roomData.url;
      videoRoomId = roomData.name;
      console.log('Daily.co room created:', videoJoinUrl);
    } else {
      throw new Error('DAILY_API_KEY not configured');
    }

    // STEP 2: Create session with video URL already set (READY immediately)
    const scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
    const joinToken = crypto.randomUUID();
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        client_id: clientId,
        coach_id: coachId,
        scheduled_time: scheduledTime.toISOString(),
        duration_minutes: 15,
        price_amount: 25.00,
        price_currency: 'GBP',
        coin_cost: 1,
        status: 'confirmed', // Already confirmed - no waiting!
        session_state: 'ready', // Ready immediately!
        join_token: joinToken,
        token_expires_at: tokenExpiration.toISOString(),
        notes: JSON.stringify({ userGoal: userGoal.title, clientBio, type: 'instant' })
      })
      .select('*')
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session', details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session created:', session.id);

    // STEP 3: Store video details immediately
    await supabase
      .from('session_video_details')
      .upsert({
        session_id: session.id,
        video_room_id: videoRoomId,
        video_join_url: videoJoinUrl
      }, { onConflict: 'session_id' });

    console.log('Video details stored for session:', session.id);

    // STEP 4: Initialize recording
    await supabase
      .from('session_recordings')
      .upsert({
        session_id: session.id,
        transcription_status: 'initialized'
      }, { onConflict: 'session_id' });

    // Get client info for emails
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', clientId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(clientId);
    const clientEmail = authUser?.user?.email;

    // STEP 5: Send coach notification with DIRECT video link (no accept/decline needed)
    try {
      await supabase.functions.invoke('send-connection-notification', {
        body: { 
          sessionId: session.id,
          coachId,
          clientId,
          userGoal: userGoal.title,
          clientBio,
          type: 'instant',
          videoJoinUrl // Pass the video URL directly!
        }
      });
      console.log('Coach notification sent with video link');
    } catch (notificationError) {
      console.error('Failed to send coach notification:', notificationError);
    }

    // Send client confirmation
    if (clientEmail) {
      try {
        await supabase.functions.invoke('send-enhanced-session-email', {
          body: {
            sessionId: session.id,
            clientEmail: clientEmail,
            clientName: clientProfile?.full_name || 'Client',
            coachName: coach.name,
            emailType: 'confirmation',
            videoJoinUrl // Include video URL for client too!
          }
        });
        console.log('Client confirmation email sent with video link');
      } catch (emailError) {
        console.error(`Failed to send client email:`, emailError);
      }
    }

    // Return success with video URL (client can join immediately!)
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        videoJoinUrl, // Return the URL so client can join immediately!
        message: 'Session created - join anytime!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
