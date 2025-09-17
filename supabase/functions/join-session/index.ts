import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.log('No token provided in join request');
      return Response.redirect('/error?code=missing-token', 302);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing join request for token: ${token}`);

    // Find session by join_token
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, client_id, coach_id, scheduled_time, video_join_url, video_room_id')
      .eq('join_token', token)
      .single();

    if (sessionError || !session) {
      console.log('Session not found for token:', token, sessionError);
      return Response.redirect('/error?code=session-not-found', 302);
    }

    console.log(`Found session: ${session.id}`);

    // Check if video room already exists
    if (session.video_join_url && session.video_room_id) {
      console.log('Video room already exists, redirecting to session');
      return Response.redirect(`/session/${session.id}`, 302);
    }

    // Create Daily.co room (JIT)
    console.log('Creating Daily.co room for first join');
    try {
      const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
        body: { sessionId: session.id }
      });

      if (roomError) {
        console.error('Failed to create Daily.co room:', roomError);
        return Response.redirect('/error?code=video-provider-down', 302);
      }

      console.log('Daily.co room created successfully');
      
      // Update session with video details
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          video_join_url: roomData.videoJoinUrl,
          video_room_id: roomData.videoRoomId,
          session_state: 'ready'
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Failed to update session with video details:', updateError);
        return Response.redirect('/error?code=database-error', 302);
      }

      console.log('Session updated with video details');

    } catch (error) {
      console.error('Error creating video room:', error);
      return Response.redirect('/error?code=video-provider-down', 302);
    }

    // Redirect to session page
    console.log(`Redirecting to session: ${session.id}`);
    return Response.redirect(`/session/${session.id}`, 302);

  } catch (error) {
    console.error('Unexpected error in join-session:', error);
    return Response.redirect('/error?code=server-error', 302);
  }
});