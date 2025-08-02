import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, userId } = await req.json();

    console.log('Migrating guest session:', { sessionId, userId });

    // Get guest session data
    const { data: guestSession, error: fetchError } = await supabase
      .from('guest_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (fetchError) {
      console.error('Error fetching guest session:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Guest session not found',
        success: false 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!guestSession) {
      return new Response(JSON.stringify({ 
        error: 'No guest session data found',
        success: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if data already migrated
    const { data: existingResponse, error: checkError } = await supabase
      .from('user_responses')
      .select('id')
      .eq('guest_session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!checkError && existingResponse) {
      console.log('Guest session already migrated');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Already migrated'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Migrate to user_responses table
    const { error: insertError } = await supabase
      .from('user_responses')
      .insert({
        user_id: userId,
        selected_goal: guestSession.selected_goal,
        responses: guestSession.responses,
        ai_analysis: guestSession.ai_analysis,
        recommended_coaches: guestSession.recommended_coaches || [],
        guest_session_id: sessionId
      });

    if (insertError) {
      console.error('Error migrating guest session:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to migrate session data',
        details: insertError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully migrated guest session data');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Guest session migrated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in migrate-guest-session:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});