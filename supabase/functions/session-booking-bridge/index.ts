import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionBookingRequest {
  action: 'book_from_assessment' | 'convert_guest_session' | 'link_response_to_session';
  // For guest session conversion
  guestSessionId?: string;
  userId?: string;
  // For assessment-based booking
  userResponseId?: string;
  coachId?: string;
  scheduledTime?: string;
  sessionDuration?: number;
  // For linking existing response to session
  sessionId?: string;
  responseId?: string;
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
    const {
      action,
      guestSessionId,
      userId,
      userResponseId,
      coachId,
      scheduledTime,
      sessionDuration,
      sessionId,
      responseId
    }: SessionBookingRequest = await req.json();

    console.log(`Session Booking Bridge - Action: ${action}`);

    switch (action) {
      case 'convert_guest_session':
        if (!guestSessionId || !userId) {
          throw new Error('guestSessionId and userId are required for convert_guest_session action');
        }

        // Check system capacity first
        const { data: capacityCheck } = await supabase.functions.invoke('enhanced-session-management', {
          body: { action: 'check_capacity' }
        });

        if (!capacityCheck?.canCreateSession) {
          return new Response(JSON.stringify({
            success: false,
            error: 'System at capacity - cannot create new sessions'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch guest session data
        const { data: guestSession, error: guestError } = await supabase
          .from('guest_sessions')
          .select('*')
          .eq('session_id', guestSessionId)
          .single();

        if (guestError || !guestSession) {
          throw new Error('Guest session not found or expired');
        }

        // Create user response from guest session
        const { data: newUserResponse, error: responseError } = await supabase
          .from('user_responses')
          .insert({
            user_id: userId,
            session_id: crypto.randomUUID(), // This will be linked to actual session later
            selected_goal: guestSession.selected_goal,
            responses: guestSession.responses,
            ai_analysis: guestSession.ai_analysis,
            recommended_coaches: guestSession.recommended_coaches || [],
            guest_session_id: guestSessionId
          })
          .select()
          .single();

        if (responseError) {
          console.error('Error creating user response:', responseError);
          throw responseError;
        }

        // Get the first recommended coach if no coach specified
        let selectedCoachId = coachId;
        if (!selectedCoachId && guestSession.recommended_coaches?.length > 0) {
          selectedCoachId = guestSession.recommended_coaches[0];
        }

        if (!selectedCoachId) {
          throw new Error('No coach specified and no recommended coaches available');
        }

        // Fetch coach details for pricing
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('hourly_rate_amount, hourly_coin_cost, min_session_duration, max_session_duration')
          .eq('id', selectedCoachId)
          .single();

        if (coachError || !coach) {
          throw new Error('Coach not found');
        }

        const duration = sessionDuration || coach.min_session_duration || 30;
        const priceAmount = (coach.hourly_rate_amount * duration) / 60;
        const coinCost = Math.round((coach.hourly_coin_cost * duration) / 60);

        // Create actual session
        const sessionUuid = crypto.randomUUID();
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            id: sessionUuid,
            session_id: `sess_${Date.now()}_${sessionUuid.slice(0, 8)}`,
            client_id: userId,
            coach_id: selectedCoachId,
            scheduled_time: scheduledTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default to 24h from now
            duration_minutes: duration,
            price_amount: priceAmount,
            coin_cost: coinCost,
            session_state: 'scheduled',
            notes: `Converted from guest session ${guestSessionId}`,
            participant_status: {
              client_joined: false,
              coach_joined: false,
              guest_session_converted: true
            }
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          throw sessionError;
        }

        // Update user response to link to actual session
        const { error: linkError } = await supabase
          .from('user_responses')
          .update({ session_id: sessionUuid })
          .eq('id', newUserResponse.id);

        if (linkError) {
          console.error('Error linking response to session:', linkError);
        }

        // Create video room for the session
        const { data: videoRoomResult } = await supabase.functions.invoke('enhanced-session-management', {
          body: {
            action: 'create_video_room',
            sessionId: sessionUuid
          }
        });

        return new Response(JSON.stringify({
          success: true,
          sessionId: sessionUuid,
          userResponseId: newUserResponse.id,
          videoJoinUrl: videoRoomResult?.videoJoinUrl,
          priceAmount,
          coinCost,
          message: 'Guest session successfully converted to full session'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'book_from_assessment':
        if (!userResponseId || !coachId || !scheduledTime) {
          throw new Error('userResponseId, coachId, and scheduledTime are required for book_from_assessment action');
        }

        // Check capacity
        const { data: assessmentCapacityCheck } = await supabase.functions.invoke('enhanced-session-management', {
          body: { action: 'check_capacity' }
        });

        if (!assessmentCapacityCheck?.canCreateSession) {
          return new Response(JSON.stringify({
            success: false,
            error: 'System at capacity - cannot create new sessions'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch user response
        const { data: userResponse, error: userResponseError } = await supabase
          .from('user_responses')
          .select('*')
          .eq('id', userResponseId)
          .single();

        if (userResponseError || !userResponse) {
          throw new Error('User response not found');
        }

        // Fetch coach details
        const { data: assessmentCoach, error: assessmentCoachError } = await supabase
          .from('coaches')
          .select('hourly_rate_amount, hourly_coin_cost, min_session_duration, max_session_duration')
          .eq('id', coachId)
          .single();

        if (assessmentCoachError || !assessmentCoach) {
          throw new Error('Coach not found');
        }

        const assessmentDuration = sessionDuration || assessmentCoach.min_session_duration || 30;
        const assessmentPriceAmount = (assessmentCoach.hourly_rate_amount * assessmentDuration) / 60;
        const assessmentCoinCost = Math.round((assessmentCoach.hourly_coin_cost * assessmentDuration) / 60);

        // Create session from assessment
        const assessmentSessionUuid = crypto.randomUUID();
        const { data: assessmentSession, error: assessmentSessionError } = await supabase
          .from('sessions')
          .insert({
            id: assessmentSessionUuid,
            session_id: `sess_${Date.now()}_${assessmentSessionUuid.slice(0, 8)}`,
            client_id: userResponse.user_id,
            coach_id: coachId,
            scheduled_time: scheduledTime,
            duration_minutes: assessmentDuration,
            price_amount: assessmentPriceAmount,
            coin_cost: assessmentCoinCost,
            session_state: 'scheduled',
            notes: `Booked from assessment ${userResponseId}`,
            participant_status: {
              client_joined: false,
              coach_joined: false,
              booked_from_assessment: true
            }
          })
          .select()
          .single();

        if (assessmentSessionError) {
          console.error('Error creating session from assessment:', assessmentSessionError);
          throw assessmentSessionError;
        }

        // Update user response to link to session
        const { error: assessmentLinkError } = await supabase
          .from('user_responses')
          .update({ session_id: assessmentSessionUuid })
          .eq('id', userResponseId);

        if (assessmentLinkError) {
          console.error('Error linking assessment to session:', assessmentLinkError);
        }

        // Create video room
        const { data: assessmentVideoResult } = await supabase.functions.invoke('enhanced-session-management', {
          body: {
            action: 'create_video_room',
            sessionId: assessmentSessionUuid
          }
        });

        return new Response(JSON.stringify({
          success: true,
          sessionId: assessmentSessionUuid,
          userResponseId,
          videoJoinUrl: assessmentVideoResult?.videoJoinUrl,
          priceAmount: assessmentPriceAmount,
          coinCost: assessmentCoinCost,
          message: 'Session successfully booked from assessment'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'link_response_to_session':
        if (!sessionId || !responseId) {
          throw new Error('sessionId and responseId are required for link_response_to_session action');
        }

        // Update user response to link to session
        const { error: simpleLinkError } = await supabase
          .from('user_responses')
          .update({ session_id: sessionId })
          .eq('id', responseId);

        if (simpleLinkError) {
          console.error('Error linking response to session:', simpleLinkError);
          throw simpleLinkError;
        }

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          responseId,
          message: 'Response successfully linked to session'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in session booking bridge:', error);
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