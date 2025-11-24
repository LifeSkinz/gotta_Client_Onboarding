import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Connection pool management
const MAX_DB_CONNECTIONS = 10;
let activeConnections = 0;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check connection pool capacity
  if (activeConnections >= MAX_DB_CONNECTIONS) {
    console.warn('Connection pool at capacity, rejecting request');
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable - high load'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  activeConnections++;
  const connectionStartTime = Date.now();

  try {
    const { coachId, scheduledTime, sessionDuration = 60 } = await req.json();

    if (!coachId || !scheduledTime) {
      throw new Error('Missing required fields: coachId, scheduledTime');
    }

    // Get the Authorization header and extract the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role key for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check system capacity first
    const { data: capacityResult } = await supabase.functions.invoke('enhanced-session-management', {
      body: { action: 'check_capacity' }
    });

    if (!capacityResult?.canCreateSession) {
      throw new Error('System at capacity - cannot create new sessions at this time');
    }

    // Verify the user JWT token with timeout
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 5000)
    );

    const authPromise = supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const { data: { user }, error: authError } = await Promise.race([authPromise, authTimeout]);

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log('Creating enhanced video session for user:', user.id, 'with coach:', coachId);

    // Fetch coach details and pricing with timeout
    const coachTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Coach query timeout')), 5000)
    );

    const coachPromise = supabase
      .from('coaches')
      .select('name, hourly_rate_amount, hourly_rate_currency, hourly_coin_cost, min_session_duration, max_session_duration')
      .eq('id', coachId)
      .single();

    const { data: coach, error: coachError } = await Promise.race([coachPromise, coachTimeout]);

    if (coachError || !coach) {
      throw new Error('Coach not found');
    }

    // Validate session duration
    const minDuration = coach.min_session_duration || 15;
    const maxDuration = coach.max_session_duration || 120;
    
    if (sessionDuration < minDuration || sessionDuration > maxDuration) {
      throw new Error(`Session duration must be between ${minDuration} and ${maxDuration} minutes`);
    }

    // Calculate session price and coin cost
    const sessionPriceAmount = (coach.hourly_rate_amount * sessionDuration) / 60;
    const sessionCoinCost = Math.round((coach.hourly_coin_cost * sessionDuration) / 60);

    console.log('Session pricing calculated:', {
      price: sessionPriceAmount,
      currency: coach.hourly_rate_currency,
      coins: sessionCoinCost
    });

    // Generate unique session ID and prepare for atomic transaction
    const sessionUuid = crypto.randomUUID();
    const sessionId = `sess_${Date.now()}_${sessionUuid.slice(0, 8)}`;
    const functionInstanceId = `create_session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    console.log('Generated session details:', {
      sessionUuid,
      sessionId,
      functionInstanceId
    });

    // Atomic transaction: Create session with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let session;

    while (retryCount < maxRetries) {
      try {
        // Create the session in the database with enhanced state management
        const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            id: sessionUuid,
            session_id: sessionId,
            client_id: user.id,
            coach_id: coachId,
            scheduled_time: scheduledTime,
            duration_minutes: sessionDuration,
            price_amount: sessionPriceAmount,
            price_currency: coach.hourly_rate_currency || 'USD',
            coin_cost: sessionCoinCost,
            status: 'scheduled',
            session_state: 'pending',
            token_expires_at: tokenExpiration.toISOString(),
            participant_status: {
              client_booked: true,
              coach_notified: false,
              created_via: 'enhanced_api'
            },
            resource_usage: {
              created_at: new Date().toISOString(),
              function_instance: functionInstanceId
            },
            estimated_end_time: new Date(new Date(scheduledTime).getTime() + sessionDuration * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (sessionError) {
          throw sessionError;
        }

        session = sessionData;
        break;

      } catch (error) {
        retryCount++;
        console.warn(`Session creation attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          throw new Error(`Failed to create session after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    if (!session) {
      throw new Error('Failed to create session');
    }

    console.log('Session created successfully:', session.id);

    // Update session state to scheduled using enhanced session management
    const { data: stateUpdateResult } = await supabase.functions.invoke('enhanced-session-management', {
      body: {
        action: 'update_state',
        sessionId: session.id,
        newState: 'scheduled',
        reason: 'Session successfully created and validated',
        metadata: {
          coach_id: coachId,
          client_id: user.id,
          scheduled_time: scheduledTime,
          duration_minutes: sessionDuration
        }
      }
    });

    if (!stateUpdateResult?.success) {
      console.warn('Failed to update session state to scheduled:', stateUpdateResult?.error);
    }

    // Generate video room just-in-time (will be created when session is ready to start)
    const placeholderVideoUrl = `pending://${session.id}`;

    const connectionDuration = Date.now() - connectionStartTime;
    console.log(`Session creation completed in ${connectionDuration}ms`);

    return new Response(JSON.stringify({
      sessionId: session.id,
      videoJoinUrl: placeholderVideoUrl, // Video room will be created just-in-time
      scheduledTime: session.scheduled_time,
      duration: session.duration_minutes,
      priceAmount: session.price_amount,
      priceCurrency: session.price_currency,
      coinCost: session.coin_cost,
      coachName: coach.name,
      status: session.status,
      sessionState: 'scheduled',
      message: 'Session created successfully. Video room will be generated when session starts.',
      performance: {
        connectionDuration: connectionDuration,
        retryCount: retryCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced create-video-session function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred',
      details: {
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    // Always decrement connection count
    activeConnections--;
    console.log(`Active connections: ${activeConnections}`);
  }
});