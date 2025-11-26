import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateSessionStartedEmailTemplate = (recipient: 'coach' | 'client', session: any, profile: any, sessionUrl: string) => {
  const scheduledTime = new Date(session.scheduled_time);
  const sessionDate = scheduledTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const sessionTime = scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
  });

  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 18px; }
    .content { padding: 40px 30px; }
    .alert-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center; color: white; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3); }
    .alert-box h2 { margin: 0 0 10px 0; font-size: 28px; }
    .alert-box p { margin: 0; font-size: 16px; opacity: 0.95; }
    .session-card { background: #f7fafc; border-radius: 8px; padding: 25px; margin: 20px 0; }
    .session-card p { margin: 10px 0; color: #2d3748; font-size: 16px; }
    /* Responsive CTA: full-width on narrow screens, centered and constrained on desktop */
    .join-button { display: inline-block; width: 100%; max-width: 360px; box-sizing: border-box; padding: 14px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 18px; margin: 12px auto; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); transition: all 0.3s; text-align: center; }
    .join-button:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5); }
    .footer { background: #f7fafc; padding: 25px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; }
  `;

  if (recipient === 'client') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Started</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Your Session Has Started!</h1>
            <p>Your coach is ready for you</p>
          </div>
          <div class="content">
            
            <div class="alert-box">
              <h2>🎥 Coach Online</h2>
              <p>Your coach is in the video room and ready to start</p>
            </div>

            <div class="session-card">
              <p><strong>📅 Date:</strong> ${sessionDate}</p>
              <p><strong>⏰ Time:</strong> ${sessionTime}</p>
              <p><strong>⏱️ Duration:</strong> ${session.duration_minutes || 60} minutes</p>
              <p><strong>👨‍🏫 Coach:</strong> ${session.coaches?.name || 'Your Coach'}</p>
              <p><strong>🆔 Session ID:</strong> ${session.id.slice(0, 8)}...</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${sessionUrl}" class="join-button">
                🎥 Join Session Now
              </a>
            </div>

            <div style="background: #e6fffa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #0d7a77;"><strong>💡 Tip:</strong></p>
              <p style="margin: 10px 0 0 0; color: #0d7a77;">If you're having trouble joining, try refreshing your browser and clicking the join button again. Our technical support team is standing by to help.</p>
            </div>

          </div>
          <div class="footer">
            <p><strong>Need Help?</strong> Contact support if you experience any issues joining.</p>
            <p style="margin-top: 15px; font-size: 12px;">© 2024 Coaching Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    // Coach notification
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Session Started</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Session Started</h1>
            <p>Your client is joining now</p>
          </div>
          <div class="content">
            
            <div class="alert-box">
              <h2>👤 Client Joining</h2>
              <p>${profile?.full_name || 'Your client'} is entering the video room</p>
            </div>

            <div class="session-card">
              <p><strong>📅 Date:</strong> ${sessionDate}</p>
              <p><strong>⏰ Time:</strong> ${sessionTime}</p>
              <p><strong>⏱️ Duration:</strong> ${session.duration_minutes || 60} minutes</p>
              <p><strong>👤 Client:</strong> ${profile?.full_name || 'Client'}</p>
              <p><strong>🆔 Session ID:</strong> ${session.id.slice(0, 8)}...</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${sessionUrl}" class="join-button">
                🎥 Return to Session
              </a>
            </div>

            <div style="background: #e6fffa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #0d7a77;"><strong>💡 Coach Reminder:</strong></p>
              <p style="margin: 10px 0 0 0; color: #0d7a77;">Your client is now in the waiting room or joining. Make sure your audio and video are enabled and you're ready to engage!</p>
            </div>

          </div>
          <div class="footer">
            <p><strong>Session Details:</strong> This session will automatically end after ${session.duration_minutes || 60} minutes.</p>
            <p style="margin-top: 15px; font-size: 12px;">© 2024 Coaching Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Sending session started notifications for session: ${sessionId}`);

    // Fetch session with coach and video details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coaches!fk_sessions_coach (
          id, name, title, notification_email
        ),
        session_video_details (
          video_join_url,
          video_room_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    // Fetch client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', session.client_id)
      .maybeSingle();

    // Fetch client email
    let clientEmail = null;
    try {
      const { data: clientAuthData } = await supabase.auth.admin.getUserById(session.client_id);
      clientEmail = clientAuthData?.user?.email;
    } catch (error) {
      console.error('Error fetching client auth:', error);
    }

    const videoUrl = session.session_video_details?.[0]?.video_join_url;
    const sessionUrl = videoUrl || `${CONFIG.WEBSITE_URL}/session-portal/${session.id}`;
    const coachEmail = session.coaches?.notification_email;

    console.log('Sending notifications:', {
      clientEmail: clientEmail?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      coachEmail: coachEmail?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      sessionUrl: sessionUrl.slice(0, 50) + '...'
    });

    const results = {
      clientNotified: false,
      coachNotified: false,
      errors: [] as string[]
    };

    // Queue client email
    if (clientEmail) {
      try {
        const clientEmailHtml = generateSessionStartedEmailTemplate('client', session, clientProfile, sessionUrl);
        const dedupKey = `session_started:client:${session.id}:${clientEmail}`;
        
        await supabase
          .from('email_outbox')
          .insert({
            dedup_key: dedupKey,
            template_name: 'session_started_client',
            recipient_email: clientEmail,
            recipient_name: clientProfile?.full_name || 'Client',
            subject: '✅ Your Session Has Started!',
            payload: {
              html: clientEmailHtml,
              from: 'Coaching Platform <sessions@resend.dev>'
            }
          });
        console.log(`✅ Client notification queued: ${clientEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
        results.clientNotified = true;
      } catch (error) {
        console.error('Error queuing client email:', error);
        results.errors.push(`Failed to queue client email: ${error.message}`);
      }
    }

    // Queue coach email
    if (coachEmail) {
      try {
        const coachEmailHtml = generateSessionStartedEmailTemplate('coach', session, clientProfile, sessionUrl);
        const dedupKey = `session_started:coach:${session.id}:${coachEmail}`;
        
        await supabase
          .from('email_outbox')
          .insert({
            dedup_key: dedupKey,
            template_name: 'session_started_coach',
            recipient_email: coachEmail,
            recipient_name: session.coaches?.name || 'Coach',
            subject: `🎉 Session Started - Client: ${clientProfile?.full_name || 'Client'}`,
            payload: {
              html: coachEmailHtml,
              from: 'Coaching Platform <sessions@resend.dev>'
            }
          });
        console.log(`✅ Coach notification queued: ${coachEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
        results.coachNotified = true;
      } catch (error) {
        console.error('Error queuing coach email:', error);
        results.errors.push(`Failed to queue coach email: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Session started notifications queued',
        sessionId,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-session-started-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
