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
    const { coachId, scheduledTime, sessionDuration = 60 } = await req.json();

    if (!coachId || !scheduledTime) {
      throw new Error('Coach ID and scheduled time are required');
    }

    // Get the user from the session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get coach details and pricing
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('hourly_rate_amount, hourly_coin_cost, name')
      .eq('id', coachId)
      .single();

    if (coachError || !coach) {
      throw new Error('Coach not found');
    }

    // Calculate session cost
    const priceAmount = (coach.hourly_rate_amount * sessionDuration) / 60;
    const coinCost = Math.round((coach.hourly_coin_cost * sessionDuration) / 60);

    // Generate unique session ID for VideoSDK
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, create a placeholder video room (will integrate real VideoSDK.live later)
    const videoRoomId = `room_${sessionId}`;
    const videoJoinUrl = `https://meet.videosdk.live/${videoRoomId}`;

    // Create session in database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        session_id: sessionId,
        client_id: user.id,
        coach_id: coachId,
        scheduled_time: scheduledTime,
        video_room_id: videoRoomId,
        video_join_url: videoJoinUrl,
        price_amount: priceAmount,
        coin_cost: coinCost,
        status: 'scheduled'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    console.log('Created video session:', session.id);
    console.log('Video room ID:', videoRoomId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        session,
        videoJoinUrl,
        message: 'Video session created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-video-session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});