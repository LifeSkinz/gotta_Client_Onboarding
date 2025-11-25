import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: max 3 attempts per token per minute
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get token from request body
    const { token } = await req.json();

    if (!token) {
      console.log('No token provided in join request');
      return new Response(JSON.stringify({ error: 'missing-token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing join request, token ending: ...${token.slice(-8)}`);

    // Use security definer function to get session securely
    const { data: sessions, error: sessionError } = await supabase
      .rpc('get_session_by_join_token', { _join_token: token });

    if (sessionError || !sessions || sessions.length === 0) {
      console.log('Session not found or error:', sessionError);
      return new Response(JSON.stringify({ error: 'session-not-found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = sessions[0];
    console.log(`Found session: ${session.id}`);

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(session.token_expires_at);
    
    if (now > expiresAt) {
      console.log('Token expired for session:', session.id);
      return new Response(JSON.stringify({ error: 'token-expired' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token already used (single-use enforcement)
    if (session.token_used_at) {
      console.log('Token already used for session:', session.id);
      return new Response(JSON.stringify({ error: 'token-already-used' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting check
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('join_attempts')
      .eq('id', session.id)
      .single();

    const joinAttempts = (currentSession?.join_attempts as any[]) || [];
    const recentAttempts = joinAttempts.filter((attempt: any) => {
      const attemptTime = new Date(attempt.timestamp).getTime();
      return (now.getTime() - attemptTime) < RATE_LIMIT_WINDOW_MS;
    });

    if (recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      console.log('Rate limit exceeded for session:', session.id);
      return new Response(JSON.stringify({ error: 'rate-limit-exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Record this attempt
    const newAttempt = {
      timestamp: now.toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    };
    
    await supabase
      .from('sessions')
      .update({
        join_attempts: [...joinAttempts, newAttempt]
      })
      .eq('id', session.id);

    // Check if video room already exists (idempotency)
    if (session.video_join_url) {
      console.log('Video room already exists, marking token as used');
      
      // Mark token as used
      await supabase
        .from('sessions')
        .update({ token_used_at: now.toISOString() })
        .eq('id', session.id);
      
      return new Response(JSON.stringify({ redirectUrl: `/session-portal/${session.id}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Daily.co room (JIT) with idempotency
    console.log('Creating Daily.co room for first join');
    try {
      const { data: roomData, error: roomError } = await supabase.functions.invoke('create-daily-room', {
        body: { 
          sessionId: session.id,
          idempotencyKey: `${session.id}-${session.scheduled_time}` 
        }
      });

      if (roomError) {
        console.error('Failed to create Daily.co room:', roomError);
        return new Response(JSON.stringify({ error: 'video-provider-down' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Daily.co room created successfully');
      
      // Update session with video details and mark token as used (atomic)
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          session_state: 'ready',
          token_used_at: now.toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Failed to update session:', updateError);
        return new Response(JSON.stringify({ error: 'database-error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Session updated and token marked as used');

    } catch (error) {
      console.error('Error creating video room:', error);
      return new Response(JSON.stringify({ error: 'video-provider-down' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return session portal redirect URL
    console.log(`Session ready, returning redirect URL: ${session.id}`);
    return new Response(JSON.stringify({ redirectUrl: `/session-portal/${session.id}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in join-session:', error);
    return new Response(JSON.stringify({ error: 'server-error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});