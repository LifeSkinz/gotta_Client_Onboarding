import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionManagementRequest {
  action: 'update_state' | 'check_capacity' | 'create_video_room' | 'cleanup_session';
  sessionId?: string;
  newState?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

interface CapacityCheck {
  canCreateSession: boolean;
  activeSessionsCount: number;
  maxSessionsLimit: number;
  dbConnectionsUsed: number;
  maxDbConnections: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, sessionId, newState, reason, metadata }: SessionManagementRequest = await req.json();
    const functionInstanceId = crypto.randomUUID(); // Unique instance ID for locking

    console.log(`Enhanced Session Management - Action: ${action}, SessionID: ${sessionId}`);

    switch (action) {
      case 'update_state':
        if (!sessionId || !newState) {
          throw new Error('SessionId and newState are required for update_state action');
        }

        // Use the distributed locking function
        const { data: updateResult, error: updateError } = await supabase
          .rpc('update_session_state', {
            p_session_id: sessionId,
            p_new_state: newState,
            p_locked_by: functionInstanceId,
            p_reason: reason || 'State update via enhanced management',
            p_metadata: metadata || {}
          });

        if (updateError) {
          console.error('Error updating session state:', updateError);
          throw updateError;
        }

        if (!updateResult) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Could not acquire session lock - session is being modified by another process'
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update system capacity after state change
        await supabase.rpc('update_system_capacity');

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          newState,
          message: 'Session state updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'check_capacity':
        // Check current system capacity
        const { data: capacityData, error: capacityError } = await supabase
          .from('system_capacity')
          .select('*')
          .single();

        if (capacityError) {
          console.error('Error checking capacity:', capacityError);
          throw capacityError;
        }

        const canCreateSession = capacityData.active_sessions_count < capacityData.max_sessions_limit &&
                                capacityData.db_connections_used < capacityData.max_db_connections;

        const capacityCheck: CapacityCheck = {
          canCreateSession,
          activeSessionsCount: capacityData.active_sessions_count,
          maxSessionsLimit: capacityData.max_sessions_limit,
          dbConnectionsUsed: capacityData.db_connections_used,
          maxDbConnections: capacityData.max_db_connections
        };

        return new Response(JSON.stringify(capacityCheck), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create_video_room':
        if (!sessionId) {
          throw new Error('SessionId is required for create_video_room action');
        }

        // Check capacity first
        const { data: currentCapacity } = await supabase
          .from('system_capacity')
          .select('*')
          .single();

        if (!currentCapacity || 
            currentCapacity.active_sessions_count >= currentCapacity.max_sessions_limit) {
          return new Response(JSON.stringify({
            success: false,
            error: 'System at capacity - cannot create new video rooms'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate video room details
        const videoRoomId = `room_${crypto.randomUUID()}`;
        const videoJoinUrl = `https://meet.jit.si/${videoRoomId}`;

        // Update session with video room info using distributed locking
        const { data: videoUpdateResult, error: videoUpdateError } = await supabase
          .rpc('update_session_state', {
            p_session_id: sessionId,
            p_new_state: 'ready',
            p_locked_by: functionInstanceId,
            p_reason: 'Video room created',
            p_metadata: { videoRoomId, videoJoinUrl }
          });

        if (videoUpdateError || !videoUpdateResult) {
          console.error('Error updating session with video room:', videoUpdateError);
          throw new Error('Failed to create video room - session locked');
        }

        // Update the session with video details
        const { error: sessionUpdateError } = await supabase
          .from('sessions')
          .update({
            video_room_id: videoRoomId,
            video_join_url: videoJoinUrl,
            participant_status: {
              room_created_at: new Date().toISOString(),
              room_ready: true
            }
          })
          .eq('id', sessionId);

        if (sessionUpdateError) {
          console.error('Error updating session video details:', sessionUpdateError);
          throw sessionUpdateError;
        }

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          videoRoomId,
          videoJoinUrl,
          message: 'Video room created successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'cleanup_session':
        if (!sessionId) {
          throw new Error('SessionId is required for cleanup_session action');
        }

        // Clean up expired locks first
        await supabase.rpc('cleanup_expired_session_locks');

        // Update session to completed state
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('update_session_state', {
            p_session_id: sessionId,
            p_new_state: 'completed',
            p_locked_by: functionInstanceId,
            p_reason: 'Session cleanup',
            p_metadata: { cleanup_at: new Date().toISOString() }
          });

        if (cleanupError) {
          console.error('Error during session cleanup:', cleanupError);
          throw cleanupError;
        }

        // Update system capacity
        await supabase.rpc('update_system_capacity');

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          message: 'Session cleaned up successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in enhanced session management:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});