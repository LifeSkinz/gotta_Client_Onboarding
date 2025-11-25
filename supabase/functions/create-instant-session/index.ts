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
    console.log('Creating instant session for:', { coachId, clientId });

    // First, get coach details for scheduling
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

    // Create session with 5-minute buffer for immediate coaching
    const scheduledTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const joinToken = crypto.randomUUID();
    
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
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
        status: 'scheduled',
        session_state: 'pending_coach_response',
        join_token: joinToken,
        token_expires_at: tokenExpiration.toISOString(),
        notes: JSON.stringify({ userGoal: userGoal.title, clientBio, type: 'instant' })
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session', details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session created successfully:', session.id);

    // Create Daily.co video room immediately
    let videoJoinUrl = null;
    let videoRoomId = null;
    
    try {
      const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
        body: { sessionId: session.id }
      });

      if (!roomError && roomData) {
        videoJoinUrl = roomData.videoJoinUrl;
        videoRoomId = roomData.videoRoomId;
        
        // Update session state - video details are stored in session_video_details table
        await supabase
          .from('sessions')
          .update({
            session_state: 'ready'
          })
          .eq('id', session.id);
        
        console.log('Video room created and session updated');
      } else {
        console.error('Failed to create video room:', roomError);
      }
    } catch (videoError) {
      console.error('Error creating video room:', videoError);
      // Continue - video room can be created later via join-session
    }

    // Get client email for confirmation email
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', clientId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(clientId);
    const clientEmail = authUser?.user?.email;

    // Send notifications to coach (but don't fail if this fails)
    try {
      await supabase.functions.invoke('send-connection-notification', {
        body: { 
          sessionId: session.id,
          coachId,
          clientId,
          userGoal: userGoal.title,
          clientBio,
          type: 'instant'
        }
      });
      console.log('Coach notification sent successfully');
    } catch (notificationError) {
      console.error('Failed to send coach notification:', notificationError);
      // Don't fail the request - session was created successfully
    }

    // Send client confirmation email (but don't fail if this fails)
    if (clientEmail) {
      try {
        await supabase.functions.invoke('send-enhanced-session-email', {
          body: {
            sessionId: session.id,
            clientEmail: clientEmail,
            clientName: clientProfile?.full_name || 'Client',
            coachName: coach.name,
            emailType: 'confirmation'
          }
        });
        console.log('Client confirmation email sent');
      } catch (emailError) {
        console.error(`Failed to send client email for session ${session.id}:`, emailError);
        // Don't fail the request - session was created successfully
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        message: 'Session created successfully' 
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