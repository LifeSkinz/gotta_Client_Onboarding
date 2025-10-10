import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

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
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // accept, decline, reschedule
    const sessionId = url.searchParams.get('sessionId');

    if (!action || !sessionId) {
      throw new Error('Missing required parameters: action and sessionId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get session details with proper joins and client insights
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coach:coaches(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    // Get comprehensive client data including responses and AI analysis
    const { data: clientInsights, error: insightsError } = await supabase
      .from('user_responses')
      .select('selected_goal, responses, ai_analysis')
      .eq('user_id', sessionData.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();


    // Get client details from auth.users and profiles
    console.log('Fetching client details for client_id:', sessionData.client_id);
    
    let clientEmail = null;
    let clientName = 'Client';
    
    try {
      const { data: clientAuthData, error: authError } = await supabase.auth.admin.getUserById(sessionData.client_id);
      if (authError) {
        console.error('Error fetching auth user:', authError);
      } else {
        clientEmail = clientAuthData?.user?.email;
        console.log('Client email found:', clientEmail);
      }
    } catch (authError) {
      console.error('Exception fetching auth user:', authError);
    }

    try {
      const { data: clientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', sessionData.client_id)
        .maybeSingle();
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (clientProfile) {
        clientName = clientProfile.full_name || 'Client';
        console.log('Client name found:', clientName);
      } else {
        console.log('No profile found for user');
      }
    } catch (profileError) {
      console.error('Exception fetching profile:', profileError);
    }

    const coachName = sessionData.coach?.name || 'Coach';
    console.log('Final client details - Email:', clientEmail, 'Name:', clientName, 'Coach:', coachName);

    // Generate comprehensive coach email content
    const generateCoachEmailContent = (action: string, session: any, sessionUrl: string) => {
      const scheduledTime = new Date(session.scheduled_time);
      const now = new Date();
      const minutesUntilSession = Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
      const isImmediate = minutesUntilSession <= 30;

      const clientGoal = clientInsights?.selected_goal;
      const responses = clientInsights?.responses || [];
      const analysis = clientInsights?.ai_analysis?.analysis || '';
      
      const goalSection = clientGoal ? `
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e40af;">🎯 Client's Primary Goal</h3>
          <h4 style="margin: 0 0 8px 0; color: #374151;">${clientGoal.title}</h4>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${clientGoal.description}</p>
        </div>
      ` : '';

      const responsesSection = responses.length > 0 ? `
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #059669;">💬 Client Responses</h3>
          ${responses.map(r => `
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #374151; font-size: 14px;">${r.question}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">"${r.answer}"</p>
            </div>
          `).join('')}
        </div>
      ` : '';

      const insightsSection = analysis ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #d97706;">🧠 AI Analysis & Insights</h3>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${analysis}</p>
        </div>
      ` : '';

      const starterQuestions = clientGoal ? `
        <div style="background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #7c3aed;">❓ Suggested Starter Questions</h3>
          <ul style="margin: 0; padding-left: 20px; color: #5b21b6;">
            <li style="margin-bottom: 8px;">What specific aspect of ${clientGoal.title.toLowerCase()} feels most challenging right now?</li>
            <li style="margin-bottom: 8px;">What have you already tried to address this goal?</li>
            <li style="margin-bottom: 8px;">What would success look like to you in this area?</li>
            <li style="margin-bottom: 8px;">What's holding you back from achieving this goal?</li>
          </ul>
        </div>
      ` : '';

      if (action === 'accept' || action.startsWith('accept_')) {
        return `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0;">🎉 Session Request Accepted!</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Here's everything you need to prepare for your session with ${clientName}</p>
            </div>

            ${goalSection}
            ${responsesSection}
            ${insightsSection}
            ${starterQuestions}

            ${isImmediate ? `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 30px; margin: 24px 0; text-align: center; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);">
              <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px;">🔴 IMMEDIATE SESSION</h2>
              <p style="color: rgba(255,255,255,0.95); margin: 0 0 16px 0; font-size: 14px;">
                Client is waiting online • Session ID: ${session.id.slice(0, 8)}...
              </p>
              <a href="${sessionUrl}" style="display: inline-block; padding: 16px 40px; background: white; color: #dc2626; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                🎥 Join Session Now
              </a>
            </div>
            ` : `
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <h3 style="margin: 0 0 12px 0; color: #334155;">🎥 Session Link</h3>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                Session ID: ${session.id.slice(0, 8)}...
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                You'll receive a reminder email 10 minutes before the session
              </p>
              <a href="${sessionUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">View Session Details →</a>
            </div>
            `}

            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #374151;">💡 Coaching Tips</h4>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
                <li>Review the client's responses and AI insights before the session</li>
                <li>Start with open-ended questions to understand their current situation</li>
                <li>Listen for underlying concerns that may not be explicitly stated</li>
                <li>Be prepared to adapt your coaching style based on their responses</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This email contains confidential client information. Please handle with care and maintain professional confidentiality.
              </p>
            </div>
          </div>
        `;
      }
      return '';
    };

    let responseHtml = '';
    let clientNotificationSubject = '';
    let clientNotificationContent = '';

    switch (action) {
      case 'accept':
      case 'accept_5min':
      case 'accept_10min':
        // Calculate new scheduled time based on coach response
        let newScheduledTime = new Date();
        if (action === 'accept_5min') {
          newScheduledTime = new Date(Date.now() + 5 * 60 * 1000);
        } else if (action === 'accept_10min') {
          newScheduledTime = new Date(Date.now() + 10 * 60 * 1000);
        } else {
          newScheduledTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes for immediate
        }

        // Update session status
        await supabase
          .from('sessions')
          .update({ 
            status: 'confirmed',
            session_state: 'ready',
            scheduled_time: newScheduledTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        // Send portal access notification with timing details
        const portalUrl = 'https://nqoysxjjimvihcvfpesr.lovable.app/join-session';
        
        let timingMessage = 'Ready now!';
        if (action === 'accept_5min') {
          timingMessage = 'Ready in 5 minutes';
        } else if (action === 'accept_10min') {
          timingMessage = 'Ready in 10 minutes';
        }
        
        clientNotificationSubject = `Session Accepted - ${timingMessage}`;
        clientNotificationContent = `
          <h2>🎉 Great news!</h2>
          <p>${coachName} has accepted your session request and is ${timingMessage.toLowerCase()}!</p>
          <p><strong>Status:</strong> ✅ Session confirmed and ready</p>
          <p><strong>Start Time:</strong> ${newScheduledTime.toLocaleString()}</p>
          <p><a href="${portalUrl}?token=${sessionData.join_token}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Join Session Portal</a></p>
          <p style="font-size: 14px; color: #6b7280;">Click the link above to join your session at the scheduled time. The video room will be available when the session starts.</p>
        `;

        break;

      case 'decline':
        await supabase
          .from('sessions')
          .update({ 
            status: 'declined',
            session_state: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        clientNotificationSubject = 'Session Request Update';
        clientNotificationContent = `
          <h2>Session Request Update</h2>
          <p>Unfortunately, ${coachName} is not available for your requested session.</p>
          <p>Don't worry! We'll help you find another excellent coach who matches your needs.</p>
          <p><a href="https://nqoysxjjimvihcvfpesr.lovable.app/coaches" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Browse Other Coaches</a></p>
        `;

        break;

      case 'reschedule':
        await supabase
          .from('sessions')
          .update({ 
            status: 'reschedule_requested',
            session_state: 'pending_reschedule',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        clientNotificationSubject = 'Coach Would Like to Reschedule';
        clientNotificationContent = `
          <h2>Reschedule Request</h2>
          <p>${coachName} is interested in working with you but would like to propose a different time.</p>
          <p>Please check your calendar and respond with your availability.</p>
          <p><a href="https://nqoysxjjimvihcvfpesr.lovable.app/reschedule/${sessionId}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Available Times</a></p>
        `;

        break;

      default:
        throw new Error('Invalid action');
    }

    console.log('Attempting to send notification emails');

    // Send notification emails (both coaches and clients)
    if (clientEmail) {
      try {
        const clientEmailResult = await resend.emails.send({
          from: 'Lovable Coach <onboarding@resend.dev>',
          to: [clientEmail],
          subject: clientNotificationSubject,
          html: clientNotificationContent,
        });
        console.log('Client notification email sent successfully to:', clientEmail, clientEmailResult);
      } catch (emailError) {
        console.error('Error sending client email:', emailError);
      }
    }

    // Send coach confirmation email with session link
    if (sessionData.coach?.notification_email) {
      try {
        const sessionUrl = `https://nqoysxjjimvihcvfpesr.lovable.app/session-portal/${sessionId}`;
        const coachEmailContent = generateCoachEmailContent(action, sessionData, sessionUrl);
        if (coachEmailContent) {
          const coachEmailResult = await resend.emails.send({
            from: 'Lovable Coach <onboarding@resend.dev>',
            to: [sessionData.coach.notification_email],
            subject: `Session Request ${action.charAt(0).toUpperCase() + action.slice(1)} - Client: ${clientName}`,
            html: coachEmailContent,
          });
          console.log('Coach confirmation email sent successfully to:', sessionData.coach.notification_email, coachEmailResult);
        }
      } catch (emailError) {
        console.error('Error sending coach email:', emailError);
      }
    }

    // After sending emails, redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://nqoysxjjimvihcvfpesr.lovable.app/coach-response-success?action=${action}`,
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error in handle-coach-response:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    const errorHtml = `
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #ef4444;">Error Processing Response</h1>
        <p>There was an issue processing your response.</p>
        <p>Error: ${error.message}</p>
        <p>Please contact support if this issue persists.</p>
        <p>Error ID: ${new Date().toISOString()}</p>
      </body></html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});