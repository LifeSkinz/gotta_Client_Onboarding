import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify HMAC signature to prevent URL tampering
function verifySignature(sessionId: string, token: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(`${sessionId}:${token}`)
    .digest('hex');
  return signature === expectedSignature;
}

// Helper to send email via Resend
async function sendViaResend(payload: { from: string; to: string[]; subject: string; html: string }) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const token = url.searchParams.get('token');
    const signature = url.searchParams.get('sig');
    const action = url.searchParams.get('action') || 'accept';

    console.log('Accept-session called:', { sessionId, action, hasToken: !!token, hasSig: !!signature });

    // Validate required params
    if (!sessionId || !token || !signature) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const hmacSecret = Deno.env.get('ACCEPT_LINK_SECRET') || supabaseServiceKey.slice(0, 32);
    
    // 1. Verify HMAC signature
    if (!verifySignature(sessionId, token, signature, hmacSecret)) {
      console.error('Invalid signature for session:', sessionId);
      return new Response(JSON.stringify({ error: 'Invalid or tampered link' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Atomic one-time token validation (mark as used in same query)
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .update({ accept_token_used_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('accept_token', token)
      .is('accept_token_used_at', null)
      .select('*, coaches(*)')
      .single();

    if (sessionError || !session) {
      console.error('Token already used or session not found:', sessionError);
      // Redirect to a friendly "already used" page
      return Response.redirect(`${CONFIG.WEBSITE_URL}/coach-response?error=already_used&sessionId=${sessionId}`, 302);
    }

    // 3. Handle decline action
    if (action === 'decline') {
      await supabase
        .from('sessions')
        .update({ 
          status: 'declined', 
          session_state: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      console.log('Session declined:', sessionId);
      return Response.redirect(`${CONFIG.WEBSITE_URL}/coach-response?success=declined&sessionId=${sessionId}`, 302);
    }

    // 4. Create Daily.co room (only now, on valid acceptance)
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const roomName = `session-${sessionId.slice(0, 8)}-${Date.now()}`;
    const roomConfig = {
      name: roomName,
      properties: {
        exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
        max_participants: 2,
        enable_recording: "cloud",
        enable_chat: true,
        enable_screenshare: true
      }
    };

    console.log('Creating Daily room:', roomName);
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomConfig),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      throw new Error(`Failed to create Daily room: ${errorText}`);
    }

    const roomData = await dailyResponse.json();
    console.log('Daily room created:', roomData.url);

    // 5. Update session status (triggers realtime for waiting client)
    await supabase
      .from('sessions')
      .update({ 
        status: 'confirmed',
        session_state: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // 6. Store video details in session_video_details
    await supabase
      .from('session_video_details')
      .upsert({
        session_id: sessionId,
        video_room_id: roomData.name,
        video_join_url: roomData.url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' });

    // 7. Send confirmation email to coach with join link
    const coachEmail = session.coaches?.notification_email;
    if (coachEmail) {
      try {
        await sendViaResend({
          from: 'Coaching Platform <onboarding@resend.dev>',
          to: [coachEmail],
          subject: '🎥 Session Confirmed - Join Now',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .btn { display: inline-block; background: #38b2ac; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; }
                .details { background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Session Confirmed!</h1>
                  <p>Your coaching session is ready to begin.</p>
                </div>
                <div class="details">
                  <p><strong>Session ID:</strong> ${sessionId.slice(0, 8)}...</p>
                  <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${roomData.url}" class="btn">🎥 Join Video Session</a>
                </div>
                <p style="color: #64748b; font-size: 14px; text-align: center;">
                  Click the button above to join. The client is waiting!
                </p>
              </div>
            </body>
            </html>
          `
        });
        console.log('Coach confirmation email sent');
      } catch (emailError) {
        console.error('Failed to send coach email:', emailError);
        // Don't fail the request - session is still valid
      }
    }

    console.log('Session accepted successfully:', sessionId);

    // Redirect coach to the video session or success page
    return Response.redirect(`${CONFIG.WEBSITE_URL}/coach-session/${sessionId}`, 302);

  } catch (error) {
    console.error('Error in accept-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
