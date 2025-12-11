import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC-signed accept URL (tamper-proof)
function createSignedAcceptUrl(sessionId: string, acceptToken: string, action: string): string {
  const hmacSecret = Deno.env.get('ACCEPT_LINK_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.slice(0, 32);
  const signature = createHmac('sha256', hmacSecret)
    .update(`${sessionId}:${acceptToken}`)
    .digest('hex');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  return `${supabaseUrl}/functions/v1/accept-session?sessionId=${sessionId}&token=${acceptToken}&sig=${signature}&action=${action}`;
}

// Direct Resend API helper
async function sendViaResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
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

const generateCoachEmailTemplate = (session: any, client: any, coach: any, goals: any[], clientResponses: any, acceptToken: string) => {
  const scheduledTime = new Date(session.scheduled_time);
  const sessionDate = scheduledTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const sessionTime = scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
  });

  // Generate secure, signed URLs for each action
  const acceptUrl = createSignedAcceptUrl(session.id, acceptToken, 'accept');
  const declineUrl = createSignedAcceptUrl(session.id, acceptToken, 'decline');

  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 40px 30px; }
    .section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .section:last-child { border-bottom: none; }
    .section h2 { color: #2d3748; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; }
    .client-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
    .session-details { background: #edf2f7; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .goals-grid { display: grid; gap: 15px; margin: 15px 0; }
    .goal-card { background: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; border-radius: 0 8px 8px 0; }
    .insight-card { background: #fef5e7; border-left: 4px solid #ed8936; padding: 15px; border-radius: 0 8px 8px 0; margin: 10px 0; }
    .action-buttons { text-align: center; margin: 30px 0; display: grid; gap: 10px; }
    .btn { padding: 16px 32px; margin: 0; text-decoration: none; border-radius: 8px; font-weight: 600; display: block; transition: all 0.3s; font-size: 16px; }
    .btn-primary { background: #38b2ac; color: white; }
    .btn-danger { background: #e53e3e; color: white; }
    .btn-full-width { grid-column: 1 / -1; }
    .highlight { color: #667eea; font-weight: 600; }
    .security-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 13px; color: #92400e; }
    .footer { background: #f7fafc; padding: 30px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; }
    @media (max-width: 600px) {
      .container { margin: 10px; }
      .content { padding: 30px 20px; }
      .btn { display: block; margin: 10px 0; }
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Coaching Session Request</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👋 New Session Request</h1>
          <p>A client has requested a coaching session with you</p>
        </div>
        <div class="content">
          
          <div class="section">
            <h2>📅 Session Details</h2>
            <div class="session-details">
              <p><strong>Date:</strong> ${sessionDate}</p>
              <p><strong>Time:</strong> ${sessionTime}</p>
              <p><strong>Duration:</strong> ${session.duration_minutes || 15} minutes</p>
              <p><strong>Session Type:</strong> Immediate Coaching Session</p>
              <p><strong>Compensation:</strong> ${session.coin_cost || 1} coins (${session.price_amount ? `$${session.price_amount}` : '$25.00'})</p>
              <p><strong>⚡ Priority:</strong> <span style="color: #dc2626; font-weight: bold;">IMMEDIATE - Client waiting</span></p>
            </div>
          </div>

          <div class="section">
            <h2>👤 Client Information</h2>
            <div class="client-card">
              <h3 style="margin: 0 0 15px 0; color: #2d3748;">${client?.full_name || 'Client'}</h3>
              <p><strong>Background:</strong> ${client?.bio || 'Not provided'}</p>
              <p><strong>Coaching History:</strong> ${client?.total_sessions_count || 0} previous sessions</p>
              ${client?.average_session_rating ? `<p><strong>Average Rating:</strong> ⭐ ${client.average_session_rating}/5</p>` : ''}
            </div>
          </div>

          ${goals?.length > 0 ? `
          <div class="section">
            <h2>🎯 Client Goals for This Session</h2>
            <div class="goals-grid">
              ${goals.map(goal => `
                <div class="goal-card">
                  <strong>${goal.goal_category}:</strong> ${goal.goal_description}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${clientResponses?.ai_analysis ? `
          <div class="section">
            <h2>🧠 AI Client Analysis</h2>
            <div class="insight-card">
              ${clientResponses.ai_analysis.coaching_recommendations ? `
                <p><strong>Coaching Approach:</strong> ${clientResponses.ai_analysis.coaching_recommendations}</p>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="action-buttons">
            <a href="${acceptUrl}" class="btn btn-primary">
              ✅ Accept Session - I'm Ready Now
            </a>
            <a href="${declineUrl}" class="btn btn-danger btn-full-width">
              ❌ Decline Session
            </a>
          </div>

          <div class="security-note">
            🔒 <strong>Security Note:</strong> These links are one-time use only and expire after being clicked.
          </div>

          <div class="section">
            <h2>💡 Session Tips</h2>
            <div style="background: #fef5e7; border-radius: 8px; padding: 20px;">
              <ul style="margin: 0; padding-left: 20px;">
                <li>Join the session 2 minutes early to test your setup</li>
                <li>Ensure you have a quiet, professional environment</li>
                <li>End with clear action items and next steps</li>
              </ul>
            </div>
          </div>

        </div>
        <div class="footer">
          <p><strong>Next Steps:</strong> Click Accept to create the video room and join immediately.</p>
          <p style="margin-top: 15px; font-size: 12px;">© 2024 Coaching Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, coachEmail } = await req.json();

    if (!sessionId || !coachEmail) {
      throw new Error('Missing required parameters: sessionId and coachEmail');
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session details including accept_token
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        accept_token,
        coaches (
          id, name, title, notification_email, notification_phone
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    // Fetch client profile
    const { data: client } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.client_id)
      .single();

    // Fetch session goals
    const { data: goals } = await supabase
      .from('session_goals_tracking')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    // Fetch client's latest assessment responses
    const { data: clientResponses } = await supabase
      .from('user_responses')
      .select('*')
      .eq('user_id', session.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get the accept_token for this session (already generated by DB default)
    const acceptToken = session.accept_token;
    if (!acceptToken) {
      throw new Error('Session missing accept_token');
    }

    // Generate email content with secure signed URLs
    const emailHtml = generateCoachEmailTemplate(
      session, 
      client, 
      session.coaches, 
      goals || [], 
      clientResponses,
      acceptToken
    );

    // Send email to coach
    const emailResponse = await sendViaResend({
      from: 'Coaching Platform <onboarding@resend.dev>',
      to: [coachEmail],
      subject: `🔔 New Session Request: ${client?.full_name || 'Client'} is waiting!`,
      html: emailHtml,
    });

    console.log('Enhanced coach notification sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced coach notification sent successfully',
        emailId: emailResponse?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-enhanced-coach-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});