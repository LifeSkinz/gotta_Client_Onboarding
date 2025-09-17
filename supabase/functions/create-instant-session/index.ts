import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    const { coachId, clientId, userGoal, clientBio } = await req.json();

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

    // Create session immediately (15 minutes from now to allow for quick response)
    const scheduledTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
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
        notes: JSON.stringify({ userGoal, clientBio, type: 'instant' })
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

    // Send notifications to coach (but don't fail if this fails)
    try {
      await supabase.functions.invoke('send-connection-notification', {
        body: { 
          sessionId: session.id,
          coachId,
          clientId,
          userGoal,
          clientBio,
          type: 'instant'
        }
      });
      console.log('Coach notification sent');
    } catch (notificationError) {
      console.error('Failed to send coach notification:', notificationError);
      // Don't fail the request - session was created successfully
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