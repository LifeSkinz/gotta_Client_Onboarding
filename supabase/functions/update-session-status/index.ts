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
    const { sessionId, status, additionalData = {} } = await req.json();

    if (!sessionId || !status) {
      throw new Error('Session ID and status are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare update data
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };

    // Update session status
    const { data, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    // Log status change for analytics
    await supabase
      .from('session_status_logs')
      .insert({
        session_id: sessionId,
        old_status: data.status,
        new_status: status,
        changed_at: new Date().toISOString(),
        metadata: additionalData
      });

    // Handle specific status transitions
    switch (status) {
      case 'in_progress':
        // Session started - could trigger real-time notifications
        console.log(`Session ${sessionId} started`);
        break;
        
      case 'completed':
        // Session ended - trigger analytics and cleanup
        console.log(`Session ${sessionId} completed`);
        
        // Trigger session analysis
        await supabase.functions.invoke('analyze-session-outcome', {
          body: { sessionId }
        });
        break;
        
      case 'cancelled':
        // Session cancelled - handle refunds/notifications
        console.log(`Session ${sessionId} cancelled`);
        break;
        
      case 'no_show':
        // Handle no-show scenario
        console.log(`Session ${sessionId} marked as no-show`);
        break;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: data,
        message: `Session status updated to ${status}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in update-session-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});