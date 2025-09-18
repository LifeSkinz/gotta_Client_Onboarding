import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateCoachEmailTemplate = (session: any, client: any, coach: any, goals: any[], clientResponses: any) => {
  const scheduledTime = new Date(session.scheduled_time);
  const sessionDate = scheduledTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const sessionTime = scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
  });

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
    .action-buttons { text-align: center; margin: 30px 0; }
    .btn { padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; transition: all 0.3s; }
    .btn-primary { background: #38b2ac; color: white; }
    .btn-secondary { background: #4299e1; color: white; }
    .btn-danger { background: #e53e3e; color: white; }
    .highlight { color: #667eea; font-weight: 600; }
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
              <p><strong>Duration:</strong> ${session.duration_minutes || 60} minutes</p>
              <p><strong>Session Type:</strong> ${session.request_type || 'Standard'} Session</p>
              <p><strong>Compensation:</strong> ${session.coin_cost || 100} coins (${session.price_amount ? `$${session.price_amount}` : 'TBD'})</p>
            </div>
          </div>

          <div class="section">
            <h2>👤 Client Information</h2>
            <div class="client-card">
              <h3 style="margin: 0 0 15px 0; color: #2d3748;">${client?.full_name || 'Client'}</h3>
              <p><strong>Background:</strong> ${client?.bio || 'Not provided'}</p>
              <p><strong>Coaching History:</strong> ${client?.total_sessions_count || 0} previous sessions</p>
              ${client?.average_session_rating ? `<p><strong>Average Rating:</strong> ⭐ ${client.average_session_rating}/5</p>` : ''}
              ${client?.last_session_at ? `<p><strong>Last Session:</strong> ${new Date(client.last_session_at).toLocaleDateString()}</p>` : ''}
              ${client?.preferred_session_times ? `<p><strong>Preferred Times:</strong> ${client.preferred_session_times.join(', ')}</p>` : ''}
            </div>
          </div>

          ${goals?.length > 0 ? `
          <div class="section">
            <h2>🎯 Client Goals for This Session</h2>
            <div class="goals-grid">
              ${goals.map(goal => `
                <div class="goal-card">
                  <strong>${goal.goal_category}:</strong> ${goal.goal_description}
                  ${goal.initial_assessment ? `<br><small>Priority Level: ${goal.initial_assessment}/10</small>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${clientResponses?.ai_analysis ? `
          <div class="section">
            <h2>🧠 AI Client Analysis</h2>
            <div class="insight-card">
              <h4 style="margin: 0 0 10px 0;">Key Insights:</h4>
              ${clientResponses.ai_analysis.personality_traits ? `
                <p><strong>Personality:</strong> ${Object.entries(clientResponses.ai_analysis.personality_traits).map(([key, value]) => `${key}: ${value}`).join(', ')}</p>
              ` : ''}
              ${clientResponses.ai_analysis.communication_style ? `
                <p><strong>Communication Style:</strong> ${JSON.stringify(clientResponses.ai_analysis.communication_style)}</p>
              ` : ''}
              ${clientResponses.ai_analysis.coaching_recommendations ? `
                <p><strong>Coaching Approach:</strong> ${clientResponses.ai_analysis.coaching_recommendations}</p>
              ` : ''}
            </div>
          </div>
          ` : ''}

          ${clientResponses?.responses ? `
          <div class="section">
            <h2>📝 Client Assessment Responses</h2>
            <div style="background: #f7fafc; border-radius: 8px; padding: 20px;">
              ${Object.entries(clientResponses.responses).map(([question, answer]) => `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                  <strong style="color: #2d3748;">${question}:</strong><br>
                  <span style="color: #4a5568;">${answer}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <h2>🎯 Preparation Recommendations</h2>
            <div style="background: #e6fffa; border-radius: 8px; padding: 20px;">
              <ul style="margin: 0; padding-left: 20px;">
                <li>Review the client's goals and assessment responses above</li>
                <li>Consider how your coaching style aligns with their needs</li>
                <li>Prepare relevant exercises or frameworks for their challenges</li>
                <li>Think about specific questions to help them gain clarity</li>
                <li>Have backup discussion topics ready based on their interests</li>
              </ul>
            </div>
          </div>

          <div class="action-buttons">
            <a href="https://nqoysxjjimvihcvfpesr.supabase.co/functions/v1/handle-coach-response?action=accept&sessionId=${session.id}" class="btn btn-primary">
              ✅ Accept Session
            </a>
            <a href="https://nqoysxjjimvihcvfpesr.supabase.co/functions/v1/handle-coach-response?action=reschedule&sessionId=${session.id}" class="btn btn-secondary">
              📅 Request Reschedule
            </a>
            <a href="https://nqoysxjjimvihcvfpesr.supabase.co/functions/v1/handle-coach-response?action=decline&sessionId=${session.id}" class="btn btn-danger">
              ❌ Decline Session
            </a>
          </div>

          <div class="section">
            <h2>💡 Session Tips</h2>
            <div style="background: #fef5e7; border-radius: 8px; padding: 20px;">
              <p><strong>For the best session experience:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Join the session 5 minutes early to test your setup</li>
                <li>Ensure you have a quiet, professional environment</li>
                <li>Keep session notes for follow-up communications</li>
                <li>End with clear action items and next steps</li>
                <li>Follow up within 24 hours with a session summary</li>
              </ul>
            </div>
          </div>

        </div>
        <div class="footer">
          <p><strong>Next Steps:</strong> Click one of the action buttons above to respond to this session request.</p>
          <p>Need help? Contact platform support for assistance.</p>
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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
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

    // Generate email content
    const emailHtml = generateCoachEmailTemplate(
      session, 
      client, 
      session.coaches, 
      goals || [], 
      clientResponses
    );

    // Send email to coach
    const emailResponse = await resend.emails.send({
      from: 'Coaching Platform <coaches@resend.dev>',
      to: [coachEmail],
      subject: `New Session Request: ${new Date(session.scheduled_time).toLocaleDateString()} with ${client?.full_name || 'Client'}`,
      html: emailHtml,
    });

    console.log('Enhanced coach notification sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced coach notification sent successfully',
        emailId: emailResponse.data?.id
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